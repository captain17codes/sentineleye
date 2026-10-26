import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { runScanPipeline } from '../scan/pipeline';
import { SEEDED_ZONES } from '../../api/seededData';
import { prepareSiteScene } from '../scan/realScene';

describe('Calibrated Telemetry Engine Modeled on Real Sites', () => {
  it('loads the Z-102 site scene (real Sentinel-2 or calibrated) and runs the pipeline on its own crop', () => {
    const t0Path = path.resolve(__dirname, '../../../public/real/102/t0.json');
    const t1Path = path.resolve(__dirname, '../../../public/real/102/t1.json');

    expect(fs.existsSync(t0Path)).toBe(true);
    expect(fs.existsSync(t1Path)).toBe(true);

    const t0Data = JSON.parse(fs.readFileSync(t0Path, 'utf-8'));
    const t1Data = JSON.parse(fs.readFileSync(t1Path, 'utf-8'));

    // Copernicus Sentinel-2 product IDs (S2A/S2B/S2C), whichever satellite took the scene
    expect(t0Data.scene_id).toMatch(/^S2[ABC]_/);
    expect(t1Data.scene_id).toMatch(/^S2[ABC]_/);
    expect(t0Data.red.length).toBe(256 * 256);

    const p = prepareSiteScene(t0Data, t1Data, 'fused', 256, 102);
    if (p.isRealData) {
      expect(t0Data.source.kind).toBe('REAL');
      // reflectance must be physical values, not leftovers from synthetic generators
      expect(Math.max(...t0Data.nir.slice(0, 5000))).toBeLessThanOrEqual(1);
      expect(Math.min(...t0Data.red.slice(0, 5000))).toBeGreaterThanOrEqual(0);
    }

    const zoneRecord = SEEDED_ZONES.find((z) => z.id === 102)!;
    const output = runScanPipeline({
      zoneId: 102,
      bbox: p.bbox!,
      zoneGeoJson: JSON.parse(zoneRecord.geojson),
      mode: p.effectiveMode,
      cloudCoverage: 0,
      seed: 144,
      dataSource: 'real',
      realScene: { t0: p.scene.t0, t1: p.scene.t1, cloudMask: p.cloudMask },
    });

    expect(output).toBeDefined();
    expect(output.stats.rawDetectionsCount).toBeGreaterThanOrEqual(output.stats.validatedCount);
    // every detection must lie on the site crop itself
    for (const d of output.detections) {
      expect(d.centroid[0]).toBeGreaterThanOrEqual(p.bbox!.minLng);
      expect(d.centroid[0]).toBeLessThanOrEqual(p.bbox!.maxLng);
      expect(d.centroid[1]).toBeGreaterThanOrEqual(p.bbox!.minLat);
      expect(d.centroid[1]).toBeLessThanOrEqual(p.bbox!.maxLat);
    }
  });

  it('verifies control negative site (Z-107 Bhindawas) outputs zero false-positive alerts', () => {
    const t0Path = path.resolve(__dirname, '../../../public/real/107/t0.json');
    const t1Path = path.resolve(__dirname, '../../../public/real/107/t1.json');

    expect(fs.existsSync(t0Path)).toBe(true);
    expect(fs.existsSync(t1Path)).toBe(true);

    const t0Data = JSON.parse(fs.readFileSync(t0Path, 'utf-8'));
    const t1Data = JSON.parse(fs.readFileSync(t1Path, 'utf-8'));

    const zoneRecord = SEEDED_ZONES.find((z) => z.id === 107)!;
    const geoJson = JSON.parse(zoneRecord.geojson);

    const bbox = {
      minLng: t0Data.bbox[0],
      minLat: t0Data.bbox[1],
      maxLng: t0Data.bbox[2],
      maxLat: t0Data.bbox[3],
    };

    const output = runScanPipeline({
      zoneId: 107,
      bbox,
      zoneGeoJson: geoJson,
      mode: 'fused',
      cloudCoverage: 0,
      dataSource: 'real',
      realScene: {
        t0: {
          red: new Float32Array(t0Data.red),
          nir: new Float32Array(t0Data.nir),
          sar: new Float32Array(t0Data.sar),
        },
        t1: {
          red: new Float32Array(t1Data.red),
          nir: new Float32Array(t1Data.nir),
          sar: new Float32Array(t1Data.sar),
        },
      },
    });

    // Control negative site must produce 0 validated encroachment alerts
    expect(output.detections.length).toBe(0);
    expect(output.stats.validatedCount).toBe(0);
  });
});
