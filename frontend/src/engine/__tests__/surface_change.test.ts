import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  analyzeSurfaceChange,
  ndviAt,
  bsiAt,
  rednessAt,
  pixelToLngLat,
  distanceM,
  SpectralBands,
} from '../scan/surfaceChange';

const S = 32;
const N = S * S;
const fill = (v: number) => new Array(N).fill(v);

const vegetation = { red: 0.05, nir: 0.35, blue: 0.04, swir16: 0.18 };
const whiteRoofs = { red: 0.2, nir: 0.24, blue: 0.19, swir16: 0.26 };
const brownEarth = { red: 0.22, nir: 0.26, blue: 0.11, swir16: 0.34 };

function scene(base: typeof vegetation, patch?: typeof vegetation, from = 8, to = 20): SpectralBands {
  const b = { red: fill(base.red), nir: fill(base.nir), blue: fill(base.blue), swir16: fill(base.swir16) };
  if (patch) {
    for (let y = from; y < to; y++)
      for (let x = from; x < to; x++) {
        const i = y * S + x;
        b.red[i] = patch.red;
        b.nir[i] = patch.nir;
        b.blue[i] = patch.blue;
        b.swir16[i] = patch.swir16;
      }
  }
  return b;
}

describe('multi-index surface change', () => {
  it('computes NDVI, BSI and redness from reflectance', () => {
    const b = scene(vegetation);
    expect(ndviAt(b, 0)).toBeCloseTo(0.3 / 0.4, 4);
    expect(bsiAt(b, 0)).toBeCloseTo((0.18 + 0.05 - 0.39) / (0.18 + 0.05 + 0.39), 4);
    expect(rednessAt(b, 0)).toBeCloseTo(0.01 / 0.09, 4);
  });

  it('finds a demolition (white roofs -> brown earth) as one cleared cluster', () => {
    const r = analyzeSurfaceChange(scene(vegetation, whiteRoofs), scene(vegetation, brownEarth), null, S);
    expect(r.clusters.length).toBe(1);
    expect(r.clusters[0].kind).toBe('cleared');
    // density filter trims the 4 sharp corners of the 12x12 square
    expect(r.clusters[0].pixels).toBe(140);
    expect(r.clusters[0].cx).toBeCloseTo(13.5, 1);
  });

  it('finds vegetation cleared to bare soil', () => {
    const r = analyzeSurfaceChange(scene(vegetation), scene(vegetation, brownEarth), null, S);
    expect(r.clusters.length).toBe(1);
    expect(r.changedAreaM2).toBe(140 * 100);
  });

  it('removes a whole-scene shift (season / sensor) by normalisation', () => {
    const greener = { ...vegetation, nir: 0.42 };
    const r = analyzeSurfaceChange(scene(vegetation), scene(greener), null, S);
    expect(r.clusters.length).toBe(0);
    expect(r.sceneShift.ndvi).toBeGreaterThan(0.03);
  });

  it('drops isolated noise pixels and masked pixels', () => {
    const t1 = scene(vegetation);
    t1.red[5] = brownEarth.red; t1.blue[5] = brownEarth.blue; t1.nir[5] = brownEarth.nir; t1.swir16[5] = brownEarth.swir16;
    const invalid = new Uint8Array(N);
    invalid[0] = 1;
    const r = analyzeSurfaceChange(scene(vegetation), t1, invalid, S);
    expect(r.validPixels).toBe(N - 1);
    expect(r.clusters.length).toBe(0);
  });

  it('converts pixels to coordinates and measures distance', () => {
    const [lng, lat] = pixelToLngLat(0, 0, [77.0, 28.0, 77.1, 28.1], 100);
    expect(lng).toBeCloseTo(77.0005, 4);
    expect(lat).toBeCloseTo(28.0995, 4);
    expect(distanceM([77.0, 28.0], [77.0, 28.01])).toBeCloseTo(1112, -1);
  });
});

// Real data: Khori Gaon demolition (2021) vs the Asola Bhatti control site
const caseDir = path.resolve(__dirname, '../../../public/real/cases/khori-gaon');
const controlDir = path.resolve(__dirname, '../../../public/real/104');
const BAD = new Set([0, 1, 3, 6, 8, 9, 10]);
const load = (d: string, f: string) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf-8'));
const hasReal = fs.existsSync(path.join(caseDir, 't0.json')) && fs.existsSync(path.join(controlDir, 't0.json'));

describe.skipIf(!hasReal)('real Sentinel-2 validation: Khori Gaon', () => {
  const run = (d: string) => {
    const t0 = load(d, 't0.json');
    const t1 = load(d, 't1.json');
    const inv = new Uint8Array(256 * 256);
    for (let i = 0; i < inv.length; i++) if (BAD.has(t0.scl[i]) || BAD.has(t1.scl[i])) inv[i] = 1;
    return { r: analyzeSurfaceChange(t0, t1, inv, 256), bbox: t0.bbox as [number, number, number, number] };
  };

  it('puts the largest change cluster at the documented demolition site, well above the control', () => {
    const { r, bbox } = run(caseDir);
    const { r: control } = run(controlDir);
    const top = r.clusters[0];
    const at = pixelToLngLat(top.cx, top.cy, bbox, 256);
    expect(distanceM(at, [77.2804, 28.4906])).toBeLessThan(500);
    expect(top.areaM2).toBeGreaterThan(200_000); // > 20 ha
    expect(top.areaM2).toBeGreaterThan(2 * control.clusters[0].areaM2);
  });
});
