import urllib.request
import urllib.parse
import json

queries = {
    "asola": '[out:json][timeout:15];relation["boundary"="protected_area"]["name"~"Asola",i];out geom;',
    "bhindawas": '[out:json][timeout:15];relation["name"~"Bhindawas",i];out geom;',
}

for k, q in queries.items():
    try:
        data = urllib.parse.urlencode({"data": q}).encode("utf-8")
        req = urllib.request.Request(
            "https://overpass-api.de/api/interpreter",
            data=data,
            headers={"User-Agent": "SentinelEye-Research/2.0 (research@sentineleye.org)"}
        )
        with urllib.request.urlopen(req, timeout=15) as r:
            d = json.loads(r.read().decode())
            print(f"{k}: {len(d.get('elements', []))} elements found")
    except Exception as e:
        print(f"{k}: error {e}")
