#!/usr/bin/env python3
"""
fetch_real_zones.py — REAL protected-area polygons from OpenStreetMap (Overpass API).

Replaces the sine-wave "organic polygons" made by generate_real_zones.js.

Two steps (human in the loop on purpose — OSM names are messy):

  1) list   Query OSM for each zone in tools/zone_sources.json and print every
            matching feature (OSM id, name, tags, area). Nothing is written.
  2) build  After you copy the OSM ids you want into zone_sources.json ("osm_ids"),
            merge them into one polygon per zone and write tools/out/zones_real.geojson.

Zones with no real OSM feature are reported as MISSING. Do NOT invent a polygon for
them: drop the zone or draw it yourself from an official source (geojson.io) and
say so in the UI.

Data: © OpenStreetMap contributors, ODbL. Keep that attribution (it is now true).

Usage:
  python tools/fetch_real_zones.py list
  python tools/fetch_real_zones.py build
"""
import argparse
import json
import os
import sys

import requests
from pyproj import Geod
from shapely.geometry import LineString, Polygon, mapping
from shapely.ops import linemerge, polygonize, unary_union

OVERPASS = "https://overpass-api.de/api/interpreter"
GEOD = Geod(ellps="WGS84")
TAG_KEYS = {
    "leisure": "nature_reserve",
    "boundary": "protected_area|national_park",
    "landuse": "forest",
    "natural": "wood|water|wetland",
}


def overpass_query(regex, bbox):
    s, w, n, e = bbox[1], bbox[0], bbox[3], bbox[2]
    parts = [f'nwr["name"~"{regex}",i]["{k}"~"{v}"]({s},{w},{n},{e});' for k, v in TAG_KEYS.items()]
    return "[out:json][timeout:120];(" + "".join(parts) + ");out geom;"


def run_overpass(q):
    r = requests.post(OVERPASS, data={"data": q}, timeout=180)
    r.raise_for_status()
    return r.json().get("elements", [])


def element_to_geom(el):
    """OSM element (with `out geom`) -> shapely (Multi)Polygon or None."""
    if el["type"] == "way":
        pts = [(p["lon"], p["lat"]) for p in el.get("geometry", [])]
        if len(pts) >= 4 and pts[0] == pts[-1]:
            poly = Polygon(pts)
            return poly if poly.is_valid else poly.buffer(0)
        return None
    if el["type"] == "relation":
        outers = [
            LineString([(p["lon"], p["lat"]) for p in m["geometry"]])
            for m in el.get("members", [])
            if m.get("type") == "way" and m.get("role") == "outer" and m.get("geometry")
        ]
        inners = [
            LineString([(p["lon"], p["lat"]) for p in m["geometry"]])
            for m in el.get("members", [])
            if m.get("type") == "way" and m.get("role") == "inner" and m.get("geometry")
        ]
        if not outers:
            return None
        outer_polys = list(polygonize(linemerge(outers)))
        if not outer_polys:
            return None
        geom = unary_union(outer_polys)
        if inners:
            holes = list(polygonize(linemerge(inners)))
            if holes:
                geom = geom.difference(unary_union(holes))
        return geom if geom.is_valid else geom.buffer(0)
    return None


def area_m2(geom):
    return abs(GEOD.geometry_area_perimeter(geom)[0])


def osm_ref(el):
    return f"{el['type']}/{el['id']}"


def cmd_list(cfg):
    for code, z in cfg["zones"].items():
        print(f"\n=== {code}  {z['name']}  (regex: {z['regex']}) ===")
        try:
            els = run_overpass(overpass_query(z["regex"], z["search_bbox"]))
        except Exception as e:
            print(f"  Overpass error: {e}")
            continue
        rows = []
        for el in els:
            g = element_to_geom(el)
            if g is None or g.is_empty:
                continue
            tags = el.get("tags", {})
            rows.append((area_m2(g), osm_ref(el), tags.get("name", "?"),
                         ", ".join(f"{k}={tags[k]}" for k in TAG_KEYS if k in tags)))
        if not rows:
            print("  MISSING: no OSM polygon matched. Drop this zone or draw it from an official source.")
            continue
        for a, ref, name, tg in sorted(rows, reverse=True)[:12]:
            print(f"  {ref:<18} {a/1e6:>9.2f} km2   {name}   [{tg}]")
    print('\nCopy the ids you want into tools/zone_sources.json -> "osm_ids": ["relation/123", "way/456"], then run: build')


def cmd_build(cfg, out_path):
    feats, missing = [], []
    for code, z in cfg["zones"].items():
        ids = z.get("osm_ids") or []
        if not ids:
            missing.append(code)
            continue
        els = run_overpass(overpass_query(z["regex"], z["search_bbox"]))
        chosen = [el for el in els if osm_ref(el) in ids]
        geoms = [g for g in (element_to_geom(el) for el in chosen) if g is not None and not g.is_empty]
        if not geoms:
            print(f"[warn] {code}: none of {ids} resolved to a polygon")
            missing.append(code)
            continue
        merged = unary_union(geoms).simplify(0.00005, preserve_topology=True)
        feats.append({
            "type": "Feature",
            "properties": {
                "code": code, "name": z["name"], "osm_ids": ids,
                "area_m2": round(area_m2(merged)),
                "source": "OpenStreetMap contributors (ODbL)",
                "note": "Indicative, not survey-grade cadastral record",
            },
            "geometry": mapping(merged),
        })
        print(f"{code}: {len(geoms)} feature(s), {area_m2(merged)/1e6:.2f} km2")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    json.dump({"type": "FeatureCollection", "features": feats}, open(out_path, "w"))
    print(f"\nWrote {out_path} ({len(feats)} zones). MISSING / not built: {missing or 'none'}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["list", "build"])
    ap.add_argument("--config", default="tools/zone_sources.json")
    ap.add_argument("--out", default="tools/out/zones_real.geojson")
    a = ap.parse_args()
    cfg = json.load(open(a.config))
    cmd_list(cfg) if a.cmd == "list" else cmd_build(cfg, a.out)


if __name__ == "__main__":
    main()
