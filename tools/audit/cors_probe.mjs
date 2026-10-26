import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = process.env.OUT;
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage();
await p.goto('https://sentineleye-ebon.vercel.app/', { waitUntil: 'domcontentloaded' });
const r = await p.evaluate(async () => {
  const out = {};
  try {
    const s = await fetch('https://earth-search.aws.element84.com/v1/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collections: ['sentinel-2-l2a'], bbox: [77.27, 28.48, 77.29, 28.50], datetime: '2022-03-01T00:00:00Z/2022-03-31T23:59:59Z', limit: 3, query: { 'eo:cloud_cover': { lt: 20 } } }),
    });
    const j = await s.json();
    out.stac = s.status;
    const it = j.features?.[0];
    out.item = it?.id;
    out.assets = it ? Object.keys(it.assets).join(',') : null;
    out.red = it?.assets?.red?.href;
    out.redBands = JSON.stringify(it?.assets?.red?.['raster:bands'] || null);
    out.baseline = it?.properties?.['s2:processing_baseline'];
    out.epsg = it?.properties?.['proj:epsg'] ?? it?.properties?.['proj:code'];
    if (out.red) {
      const g = await fetch(out.red, { headers: { Range: 'bytes=0-16383' } });
      out.cog = g.status + ' ' + (await g.arrayBuffer()).byteLength;
    }
  } catch (e) { out.err = String(e); }
  return out;
});
fs.appendFileSync(OUT, 'CORS PROBE ' + JSON.stringify(r, null, 1) + '\n');
await b.close();
