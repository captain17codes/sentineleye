import { describe, it, expect } from 'vitest';
import { prepareSiteScene, SiteSceneFile, SYNTHETIC_SITE_LABEL } from '../scan/realScene';
import { runScanPipeline } from '../scan/pipeline';

const SIZE = 256;
const N = SIZE * SIZE;
const AOI: [number, number, number, number] = [77.1592, 28.3610, 77.1854, 28.3840];

// Real-schema fixture: vegetated T0, a cleared 40x40 px patch at T1, optical only.
function realFixture(): { t0: SiteSceneFile; t1: SiteSceneFile } {
  const red0 = new Array(N).fill(0.05);
  const nir0 = new Array(N).fill(0.4);
  const red1 = red0.slice();
  const nir1 = nir0.slice();
  for (let y = 100; y < 140; y++) {
    for (let x = 100; x < 140; x++) {
      red1[y * SIZE + x] = 0.25;
      nir1[y * SIZE + x] = 0.28;
    }
  }
  const scl = new Array(N).fill(4);
  const base = {
    size: SIZE,
    bbox: AOI,
    sar: new Array(N).fill(0),
    scl,
    sar_available: false,
    source: { kind: 'REAL', optical: 'Copernicus Sentinel-2 L2A via Element 84 Earth Search STAC', mgrs_grid: '43RGM' },
  };
  return {
    t0: { ...base, scene_id: 'S2B_43RGM_20220330_0_L2A', datetime: '2022-03-30T05:41:00Z', cloud_cover: 0, red: red0, nir: nir0 },
    t1: { ...base, scene_id: 'S2A_43RGM_20260306_2_L2A', datetime: '2026-03-06T05:41:00Z', cloud_cover: 0, red: red1, nir: nir1 },
  };
}

const zonePolygon = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [[[77.10, 28.30], [77.25, 28.30], [77.25, 28.45], [77.10, 28.45], [77.10, 28.30]]],
  },
};

describe('Real Sentinel-2 site scenes', () => {
  it('uses the crop bbox from the file, forces optical mode without SAR, and labels data as REAL', () => {
    const { t0, t1 } = realFixture();
    const p = prepareSiteScene(t0, t1, 'fused', SIZE, 102);

    expect(p.isRealData).toBe(true);
    expect(p.sarAvailable).toBe(false);
    expect(p.effectiveMode).toBe('optical');
    expect(p.bbox).toEqual({ minLng: AOI[0], minLat: AOI[1], maxLng: AOI[2], maxLat: AOI[3] });
    expect(Array.from(p.scene.t1.sar).every((v) => v === 0)).toBe(true);
    expect(p.metadata.isRealData).toBe(true);
    expect(p.metadata.telemetrySource).toMatch(/^REAL/);
    expect(p.metadata.mgrsGrid).toBe('43RGM');
  });

  it('places the detection inside the real crop, not around the zone centre', () => {
    const { t0, t1 } = realFixture();
    const p = prepareSiteScene(t0, t1, 'fused', SIZE, 102);
    const res = runScanPipeline({
      zoneId: 102,
      bbox: p.bbox!,
      zoneGeoJson: zonePolygon,
      mode: p.effectiveMode,
      cloudCoverage: 0,
      seed: 144,
      dataSource: 'real',
      realScene: { t0: p.scene.t0, t1: p.scene.t1, cloudMask: p.cloudMask },
    } as any);

    expect(res.detections.length).toBeGreaterThan(0);
    const [lng, lat] = res.detections[0].centroid;
    expect(lng).toBeGreaterThan(AOI[0]);
    expect(lng).toBeLessThan(AOI[2]);
    expect(lat).toBeGreaterThan(AOI[1]);
    expect(lat).toBeLessThan(AOI[3]);
    // 40x40 px at ~10 m = ~160,000 m2... allow for vectorization and pixel-size rounding
    expect(res.detections[0].areaM2).toBeGreaterThan(100_000);
    expect(res.detections[0].areaM2).toBeLessThan(250_000);
  });

  it('masks cloud and no-data pixels from either date', () => {
    const { t0, t1 } = realFixture();
    t0.scl![5] = 9; // cloud in T0
    t1.scl![6] = 0; // no data in T1
    const p = prepareSiteScene(t0, t1, 'optical', SIZE, 102);
    expect(p.cloudMask[5]).toBe(1);
    expect(p.cloudMask[6]).toBe(1);
    expect(p.cloudMask[7]).toBe(0);
  });

  it('treats files without source.kind REAL as synthetic', () => {
    const { t0, t1 } = realFixture();
    delete t0.source;
    delete t1.source;
    delete t0.sar_available;
    delete t1.sar_available;
    const p = prepareSiteScene(t0, t1, 'fused', SIZE, 102);
    expect(p.isRealData).toBe(false);
    expect(p.effectiveMode).toBe('fused');
    expect(p.metadata.telemetrySource).toBe(SYNTHETIC_SITE_LABEL);
  });
});
