#!/usr/bin/env python3
"""
fetch_real_sentinel.py — REAL Sentinel pixels for SentinelEye.

Unlike the old fetch_real_scenes.py (which generated pixels with math.sin/cos),
this script reads actual Cloud-Optimized GeoTIFF windows over HTTP.

  Optical : Sentinel-2 L2A from Element 84 Earth Search STAC (free, no login)
  SAR     : Sentinel-1 RTC from Microsoft Planetary Computer (optional; needs
            `pip install planetary-computer`; coverage over India is NOT
            guaranteed, so SAR is skipped honestly if nothing is found)

Two commands:

  find   Scan a whole zone bbox for localized NDVI loss between two seasons and
         print ranked candidate AOIs with map links. YOU then check them by eye
         on satellite imagery and mark verified=true in aoi_config.json.

  fetch  For every verified AOI in aoi_config.json, pick cloud-free T0/T1 scenes,
         read 256x256 windows (~10 m) on an identical lat/lng grid, and write
         frontend/public/real/<zone_id>/{t0,t1}.json in the schema the app expects
         (scene_id, datetime, cloud_cover, size, bbox, red, nir, sar, scl)
         plus honest extras: sar_available, source.

Usage:
  pip install -r tools/requirements.txt
  python tools/fetch_real_sentinel.py find  --bbox 77.10 28.30 77.25 28.45 \
        --t0 2022-02-15/2022-04-15 --t1 2026-02-15/2026-04-15
  python tools/fetch_real_sentinel.py fetch --config tools/aoi_config.json
"""
import argparse
import datetime as dt
import json
import math
import os
import sys

import numpy as np
import requests
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_bounds
from rasterio.warp import reproject

EARTH_SEARCH = "https://earth-search.aws.element84.com/v1/search"
PC_SEARCH = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
SIZE = 256
AOI_METERS = 2560.0  # 256 px * 10 m
# Sentinel-2 SCL classes treated as unusable: 0 nodata, 1 saturated, 3 cloud shadow,
# 8/9 cloud medium/high probability, 10 thin cirrus
BAD_SCL = [0, 1, 3, 8, 9, 10]

RIO_ENV = dict(
    AWS_NO_SIGN_REQUEST="YES",
    GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
    CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif,.tiff",
    GDAL_HTTP_MULTIRANGE="YES",
    VSI_CACHE="TRUE",
)


# ───────────────────────── geometry helpers ─────────────────────────
def aoi_bbox(lng, lat, size_m=AOI_METERS):
    """[minLng, minLat, maxLng, maxLat] of a square AOI centred on lng/lat."""
    dlat = (size_m / 2) / 111_320.0
    dlng = (size_m / 2) / (111_320.0 * math.cos(math.radians(lat)))
    return [lng - dlng, lat - dlat, lng + dlng, lat + dlat]


def shape_for_bbox(bbox, res_m=10.0, max_px=2200):
    lat = (bbox[1] + bbox[3]) / 2
    w_m = (bbox[2] - bbox[0]) * 111_320.0 * math.cos(math.radians(lat))
    h_m = (bbox[3] - bbox[1]) * 111_320.0
    w = max(8, min(max_px, int(round(w_m / res_m))))
    h = max(8, min(max_px, int(round(h_m / res_m))))
    return (h, w)


# ───────────────────────── raster reading ─────────────────────────
def read_window(href, bbox, out_shape, resampling):
    """Read `bbox` (lng/lat) from a raster in ANY CRS onto a regular lat/lng grid.

    Uses a direct GDAL warp onto a destination grid defined by bbox + out_shape, so
    T0 and T1 land on the exact same grid even when the scenes come from different
    MGRS tiles / UTM zones. Only the needed COG blocks/overviews are fetched.
    Pixels outside the source footprint stay 0 (treated as nodata downstream).
    """
    h, w = out_shape
    dst_tf = from_bounds(bbox[0], bbox[1], bbox[2], bbox[3], w, h)
    with rasterio.Env(**RIO_ENV):
        with rasterio.open(href) as src:
            dst = np.zeros((h, w), dtype=src.dtypes[0])
            reproject(
                source=rasterio.band(src, 1),
                destination=dst,
                dst_transform=dst_tf,
                dst_crs="EPSG:4326",
                resampling=resampling,
                dst_nodata=0,
            )
            return dst


def scale_offset(item, key):
    """DN -> reflectance. Uses STAC raster:bands if present, otherwise the
    processing-baseline rule (baseline >= 04.00 has BOA_ADD_OFFSET = -1000)."""
    asset = item["assets"].get(key, {})
    rb = asset.get("raster:bands") or []
    if rb and "scale" in rb[0]:
        return float(rb[0]["scale"]), float(rb[0].get("offset", 0.0))
    try:
        pb = float(item["properties"].get("s2:processing_baseline", "0") or 0)
    except ValueError:
        pb = 0.0
    return 0.0001, (-0.1 if pb >= 4.0 else 0.0)


def read_optical(item, bbox, out_shape):
    bands = {}
    for key in ("red", "nir"):
        dn = read_window(item["assets"][key]["href"], bbox, out_shape, Resampling.bilinear).astype("float32")
        sc, off = scale_offset(item, key)
        refl = dn * sc + off
        refl[dn == 0] = 0.0  # nodata
        bands[key] = np.clip(refl, 0.0, 1.0)
    scl = read_window(item["assets"]["scl"]["href"], bbox, out_shape, Resampling.nearest).astype("uint8")
    return bands["red"], bands["nir"], scl


def ndvi(red, nir):
    den = nir + red
    out = np.zeros_like(den)
    ok = den > 1e-6
    out[ok] = (nir[ok] - red[ok]) / den[ok]
    return out


# ───────────────────────── STAC search ─────────────────────────
def rfc3339_range(rng):
    """STAC servers want full RFC 3339 timestamps. Accepts '2022-02-15/2022-04-15'."""
    a, _, b = rng.partition("/")

    def fix(x, end):
        x = x.strip()
        if len(x) == 10:  # date only
            return x + ("T23:59:59Z" if end else "T00:00:00Z")
        return x

    return f"{fix(a, False)}/{fix(b, True)}" if b else fix(a, False)


def stac_post(url, body):
    r = requests.post(url, json=body, timeout=90)
    if not r.ok:
        raise RuntimeError(f"STAC {r.status_code} from {url}\nrequest: {json.dumps(body)[:400]}\nresponse: {r.text[:600]}")
    return r.json().get("features", [])


def search_s2(bbox, rng, max_scene_cloud=40.0):
    feats = stac_post(EARTH_SEARCH, {"collections": ["sentinel-2-l2a"], "bbox": bbox, "datetime": rfc3339_range(rng), "limit": 100})
    feats = [f for f in feats if f["properties"].get("eo:cloud_cover", 100.0) <= max_scene_cloud]
    feats.sort(key=lambda f: f["properties"].get("eo:cloud_cover", 100.0))
    return feats


def choose_scene(bbox, rng, out_shape, max_aoi_cloud=0.02, prefer_grid=None, tries=15):
    """Pick the best usable scene. Returns (item, aoi_cloud_fraction) or (None, None)."""
    feats = search_s2(bbox, rng)
    if prefer_grid:
        same = [f for f in feats if f["properties"].get("grid:code") == prefer_grid]
        feats = same + [f for f in feats if f not in same]
    for f in feats[:tries]:
        try:
            scl = read_window(f["assets"]["scl"]["href"], bbox, out_shape, Resampling.nearest)
        except Exception as e:  # network / tile hole
            print(f"    skip {f['id']}: {e}", file=sys.stderr)
            continue
        frac = float(np.isin(scl, BAD_SCL).mean())
        print(f"    candidate {f['id']}  scene_cloud={f['properties'].get('eo:cloud_cover'):.1f}%  aoi_bad={frac*100:.1f}%")
        if frac <= max_aoi_cloud:
            return f, frac
    return None, None


def find_s1(bbox, when_iso, prefer_orbit=None, window_days=12):
    """Nearest Sentinel-1 RTC item from Planetary Computer, or None."""
    try:
        import planetary_computer  # noqa: F401
    except ImportError:
        print("    (planetary-computer not installed -> SAR skipped)")
        return None
    center = dt.datetime.fromisoformat(when_iso.replace("Z", "+00:00"))
    a = (center - dt.timedelta(days=window_days)).strftime("%Y-%m-%dT00:00:00Z")
    b = (center + dt.timedelta(days=window_days)).strftime("%Y-%m-%dT23:59:59Z")
    try:
        feats = stac_post(PC_SEARCH, {"collections": ["sentinel-1-rtc"], "bbox": bbox, "datetime": f"{a}/{b}", "limit": 50})
    except Exception as e:
        print(f"    S1 search failed: {e}")
        return None
    feats = [f for f in feats if "vv" in f.get("assets", {})]
    if not feats:
        print("    no Sentinel-1 RTC item for this AOI/date (coverage is not global)")
        return None
    def key(f):
        p = f["properties"]
        same_orbit = 0 if (prefer_orbit and (p.get("sat:orbit_state"), p.get("sat:relative_orbit")) == prefer_orbit) else 1
        d = abs((dt.datetime.fromisoformat(p["datetime"].replace("Z", "+00:00")) - center).total_seconds())
        return (same_orbit, d)
    feats.sort(key=key)
    return feats[0]


def read_sar_db(item, bbox, out_shape):
    import planetary_computer
    href = planetary_computer.sign(item["assets"]["vv"]["href"])
    lin = read_window(href, bbox, out_shape, Resampling.bilinear).astype("float32")
    valid = np.isfinite(lin) & (lin > 0)
    db = np.full(lin.shape, np.nan, dtype="float32")
    db[valid] = 10.0 * np.log10(np.clip(lin[valid], 1e-6, None))
    valid_frac = float(valid.mean())
    if valid_frac < 0.8:
        return None, valid_frac
    db[~valid] = float(np.nanmedian(db))
    return db, valid_frac


# ───────────────────────── find: rank candidate change sites ─────────────────────────
def rank_tiles(d_ndvi, valid, tile_px=256, stride=128, thresh=-0.25, top=10):
    """Rank tiles by LOCALIZED vegetation loss. A tile where the whole scene dropped
    (seasonal / phenology / different date) is flagged, not ranked high."""
    h, w = d_ndvi.shape
    rows = []
    for y in range(0, max(1, h - tile_px + 1), stride):
        for x in range(0, max(1, w - tile_px + 1), stride):
            sl = (slice(y, y + tile_px), slice(x, x + tile_px))
            v = valid[sl]
            if v.mean() < 0.9:
                continue
            d = d_ndvi[sl][v]
            changed = int((d < thresh).sum())
            rows.append(
                dict(y=y, x=x, changed_px=changed, median_dndvi=float(np.median(d)),
                     frac_changed=changed / max(1, d.size))
            )
    # localized = lots of changed pixels but tile median barely moved
    rows = [r for r in rows if r["median_dndvi"] > -0.08 and r["changed_px"] > 40]
    rows.sort(key=lambda r: r["changed_px"], reverse=True)
    picked, taken = [], []
    for r in rows:  # greedy non-overlap
        if all(abs(r["y"] - t["y"]) >= tile_px or abs(r["x"] - t["x"]) >= tile_px for t in taken):
            picked.append(r)
            taken.append(r)
        if len(picked) >= top:
            break
    return picked


def cmd_find(args):
    bbox = list(args.bbox)
    shape = shape_for_bbox(bbox)
    print(f"Zone bbox {bbox}, working grid {shape[1]}x{shape[0]} px (~10 m)")
    print("T0 scene:")
    i0, c0 = choose_scene(bbox, args.t0, shape, max_aoi_cloud=args.max_cloud)
    if not i0:
        sys.exit("No usable T0 scene. Widen --t0 range or raise --max-cloud.")
    print("T1 scene:")
    i1, c1 = choose_scene(bbox, args.t1, shape, max_aoi_cloud=args.max_cloud, prefer_grid=i0["properties"].get("grid:code"))
    if not i1:
        sys.exit("No usable T1 scene. Widen --t1 range or raise --max-cloud.")
    r0, n0, s0 = read_optical(i0, bbox, shape)
    r1, n1, s1 = read_optical(i1, bbox, shape)
    valid = ~np.isin(s0, BAD_SCL) & ~np.isin(s1, BAD_SCL)
    d = ndvi(r1, n1) - ndvi(r0, n0)
    picks = rank_tiles(d, valid, top=args.top)
    lng0, lat1, lng1, lat0 = bbox[0], bbox[3], bbox[2], bbox[1]
    print(f"\nT0 {i0['id']} ({i0['properties']['datetime'][:10]})   T1 {i1['id']} ({i1['properties']['datetime'][:10]})")
    print("Ranked candidate AOIs (CHECK EACH ON SATELLITE IMAGERY BEFORE USING):\n")
    out = []
    for k, r in enumerate(picks, 1):
        cx = r["x"] + 128
        cy = r["y"] + 128
        lng = lng0 + (cx / shape[1]) * (lng1 - lng0)
        lat = lat1 - (cy / shape[0]) * (lat1 - lat0)
        area = r["changed_px"] * 100
        link = f"https://www.google.com/maps/@{lat:.6f},{lng:.6f},17z/data=!3m1!1e3"
        print(f" {k:>2}. center=({lng:.5f}, {lat:.5f})  NDVI-loss area ~{area:,} m2  tile-median dNDVI={r['median_dndvi']:+.3f}\n     {link}")
        out.append(dict(rank=k, center=[round(lng, 6), round(lat, 6)], ndvi_loss_area_m2=area))
    if args.out:
        with open(args.out, "w") as f:
            json.dump(dict(t0=i0["id"], t1=i1["id"], candidates=out), f, indent=2)
        print(f"\nSaved {args.out}")
    print("\nNext: open each link, compare with older imagery (Google Earth historical / Esri Wayback), "
          "keep only genuine construction/quarry/clearing, put them in aoi_config.json with verified=true.")


# ───────────────────────── fetch: write app-ready crops ─────────────────────────
def write_scene(path, item, aoi_cloud, bbox, red, nir, scl, sar_db, sar_item, source_note, is_control=False):
    n = SIZE * SIZE
    payload = {
        "scene_id": item["id"],
        "datetime": item["properties"]["datetime"],
        "cloud_cover": round(aoi_cloud * 100, 2),
        "size": SIZE,
        "bbox": [round(v, 7) for v in bbox],
        "red": np.round(red, 4).ravel().tolist(),
        "nir": np.round(nir, 4).ravel().tolist(),
        "sar": (np.round(sar_db, 2).ravel().tolist() if sar_db is not None else [0.0] * n),
        "scl": scl.astype(int).ravel().tolist(),
        "sar_available": sar_db is not None,
        "is_control": bool(is_control),
        "source": {
            "kind": "REAL",
            "optical": "Copernicus Sentinel-2 L2A via Element 84 Earth Search STAC",
            "optical_item": item["id"],
            "mgrs_grid": item["properties"].get("grid:code"),
            "processing_baseline": item["properties"].get("s2:processing_baseline"),
            "sar": (f"Copernicus Sentinel-1 RTC via Microsoft Planetary Computer ({sar_item['id']})" if sar_item else None),
            "note": source_note,
        },
    }
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(payload, f, separators=(",", ":"))
    print(f"    wrote {path} ({os.path.getsize(path)/1e6:.2f} MB)")


def cmd_fetch(args):
    cfg = json.load(open(args.config))
    manifest_path = os.path.join(args.out_dir, "manifest.json")
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {"zones": []}
    manifest["data_source"] = "REAL Sentinel-2 L2A (Earth Search STAC); Sentinel-1 RTC where available"
    shape = (SIZE, SIZE)
    done = 0
    for z in cfg["aois"]:
        if args.zone and z["zone_id"] != args.zone:
            continue
        if not z.get("verified") and not args.allow_unverified:
            print(f"[skip] {z['code']}: verified=false (check the site by eye first, or use --allow-unverified)")
            continue
        print(f"\n=== {z['code']} {z['name']} ===")
        bbox = aoi_bbox(z["center"][0], z["center"][1])
        print("  T0:")
        i0, c0 = choose_scene(bbox, z["t0_range"], shape)
        print("  T1:")
        i1, c1 = choose_scene(bbox, z["t1_range"], shape, prefer_grid=(i0 or {}).get("properties", {}).get("grid:code"))
        if not i0 or not i1:
            print("  [fail] no cloud-free scene pair; widen the date ranges")
            continue
        r0, n0, s0 = read_optical(i0, bbox, shape)
        r1, n1, s1 = read_optical(i1, bbox, shape)

        sar0 = sar1 = None
        sar_i0 = sar_i1 = None
        if not args.no_sar:
            sar_i0 = find_s1(bbox, i0["properties"]["datetime"])
            if sar_i0:
                p = sar_i0["properties"]
                sar_i1 = find_s1(bbox, i1["properties"]["datetime"], prefer_orbit=(p.get("sat:orbit_state"), p.get("sat:relative_orbit")))
            if sar_i0 and sar_i1:
                sar0, v0 = read_sar_db(sar_i0, bbox, shape)
                sar1, v1 = read_sar_db(sar_i1, bbox, shape)
                if sar0 is None or sar1 is None:
                    print("  SAR pixels mostly empty -> SAR dropped for this AOI")
                    sar0 = sar1 = None
            if sar0 is None:
                sar_i0 = sar_i1 = None
        sar_ok = sar0 is not None and sar1 is not None
        note = "Optical + SAR" if sar_ok else "Optical only (no usable Sentinel-1 RTC pair); SAR channel is zero-filled and flagged sar_available=false"
        zdir = os.path.join(args.out_dir, str(z["zone_id"]))
        write_scene(os.path.join(zdir, "t0.json"), i0, c0, bbox, r0, n0, s0, sar0 if sar_ok else None, sar_i0, note, z.get("is_control"))
        write_scene(os.path.join(zdir, "t1.json"), i1, c1, bbox, r1, n1, s1, sar1 if sar_ok else None, sar_i1, note, z.get("is_control"))

        entry = {
            "zone_id": z["zone_id"], "code": z["code"], "name": z["name"], "bbox": [round(v, 7) for v in bbox],
            "center": z["center"], "is_control": bool(z.get("is_control")), "verified_by_human": bool(z.get("verified")),
            "notes": z.get("notes", ""), "sar_available": sar_ok,
            "t0": {"scene_id": i0["id"], "datetime": i0["properties"]["datetime"], "aoi_cloud_pct": round(c0 * 100, 2)},
            "t1": {"scene_id": i1["id"], "datetime": i1["properties"]["datetime"], "aoi_cloud_pct": round(c1 * 100, 2)},
        }
        manifest["zones"] = [m for m in manifest.get("zones", []) if m.get("zone_id") != z["zone_id"]] + [entry]
        done += 1
    manifest["zones"].sort(key=lambda m: m["zone_id"])
    json.dump(manifest, open(manifest_path, "w"), indent=2)
    print(f"\nDone: {done} AOI(s). Manifest: {manifest_path}")
    print("REMINDER: update frontend/public/real/ground_truth.geojson with polygons YOU drew by hand "
          "for these AOIs, otherwise the validation panel is meaningless.")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    f = sub.add_parser("find", help="rank candidate change sites inside a zone bbox")
    f.add_argument("--bbox", nargs=4, type=float, required=True, metavar=("MINLNG", "MINLAT", "MAXLNG", "MAXLAT"))
    f.add_argument("--t0", required=True, help="ISO range, e.g. 2022-02-15/2022-04-15")
    f.add_argument("--t1", required=True, help="ISO range, same season as t0")
    f.add_argument("--max-cloud", type=float, default=0.03)
    f.add_argument("--top", type=int, default=10)
    f.add_argument("--out", default="")
    f.set_defaults(fn=cmd_find)

    g = sub.add_parser("fetch", help="write t0/t1 json for verified AOIs")
    g.add_argument("--config", default="tools/aoi_config.json")
    g.add_argument("--out-dir", default="frontend/public/real")
    g.add_argument("--zone", type=int, default=0)
    g.add_argument("--no-sar", action="store_true")
    g.add_argument("--allow-unverified", action="store_true")
    g.set_defaults(fn=cmd_fetch)

    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
