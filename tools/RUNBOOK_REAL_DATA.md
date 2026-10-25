# Real data runbook (run on YOUR laptop, needs internet)

Status of the code in this kit
- TESTED locally (synthetic GeoTIFF + mock OSM data): raster window reading, reflectance scaling,
  AOI geometry, change-tile ranking, OSM polygon assembly.
- NOT TESTED (needs internet): the live calls to Earth Search, Planetary Computer and Overpass.
  If one fails, read the error, fix the query, and send it to me.
- Sentinel-1 SAR: coverage of Planetary Computer `sentinel-1-rtc` over India is NOT guaranteed.
  If no item is found the script falls back to optical-only and flags `sar_available=false`.
  Do not pretend SAR is real when it is not.

## 0. Setup
    python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
    pip install -r tools/requirements.txt
(rasterio on Windows: if pip fails use `conda install -c conda-forge rasterio`.)

## 1. Real zone boundaries (OpenStreetMap)
    python tools/fetch_real_zones.py list
Read the output, choose the right polygons, put their ids into tools/zone_sources.json -> "osm_ids",
then:
    python tools/fetch_real_zones.py build
Zones reported MISSING have no OSM polygon. Drop them. 5 honest zones beat 8 invented ones.

## 2. Find REAL change sites inside a zone
Example for the Mangar Bani / Aravalli belt (same months, different years):
    python tools/fetch_real_sentinel.py find --bbox 77.05 28.30 77.30 28.45 \
        --t0 2022-02-15/2022-04-15 --t1 2026-02-15/2026-04-15 --out tools/out/mangar_candidates.json
Open every Google Maps link it prints. Compare old vs new imagery (Google Earth history / Esri Wayback).
Keep only sites where you can SEE real construction, quarrying or clearing.
Also pick one control site where nothing changed.

## 3. Fetch the pixels
Put the verified centers into tools/aoi_config.json with "verified": true, then:
    python tools/fetch_real_sentinel.py fetch --config tools/aoi_config.json
Output: frontend/public/real/<zone_id>/t0.json, t1.json and manifest.json (real scene IDs and dates).

## 4. Hand-label ground truth
Open https://geojson.io , draw the polygon of each real change you verified, save, and replace the
features in frontend/public/real/ground_truth.geojson. The validation panel is only meaningful with this.

## 5. Hand the app changes to Antigravity
Paste the prompt in ANTIGRAVITY_REAL_DATA_PROMPT.md.

## 6. What to say in the viva
"Detection runs on real Sentinel-2 L2A pixels for N verified sites (scene IDs in the ledger).
SAR is real for sites where Sentinel-1 RTC was available, optical-only otherwise.
Other scenes are calibrated synthetic scenes used for testing the engine and the cloud case."
