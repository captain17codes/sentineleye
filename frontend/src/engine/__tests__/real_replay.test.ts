import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { runScanPipeline } from '../scan/pipeline';
import { SEEDED_ZONES } from '../../api/seededData';

describe('Calibrated Telemetry Engine Modeled on Real Sites', () => {
  it('loads calibrated scene arrays modeled on real coordinates and executes dual-sensor change detection without errors', () => {
    const t0Path = path.resolve(__dirname, '../../../public/real/102/t0.json');
    const t1Path = path.resolve(__dirname, '../../../public/real/102/t1.json');

    expect(fs.existsSync(t0Path)).toBe(true);
    expect(fs.existsSync(t1Path)).toBe(true);

    const t0Data = JSON.parse(fs.readFileSync(t0Path, 'utf-8'));
    const t1Data = JSON.parse(fs.readFileSync(t1Path, 'utf-8'));

    expect(t0Data.scene_id).toContain('S2B_');
    expect(t1Data.scene_id).toContain('S2B_');
    expect(t0Data.red.length).toBe(256 * 256);

    const zoneRecord = SEEDED_ZONES.find((z) => z.id === 102)!;
    const geoJson = JSON.parse(zoneRecord.geojson);

    const bbox = {
      minLng: t0Data.bbox[0],
      minLat: t0Data.bbox[1],
      maxLng: t0Data.bbox[2],
      maxLat: t0Data.bbox[3],
    };

    const realCloudMask = new Uint8Array(256 * 256);
    for (let i = 0; i < 256 * 256; i++) {
      if (t1Data.scl[i] === 3 || t1Data.scl[i] === 8 || t1Data.scl[i] === 9) {
        realCloudMask[i] = 1;
      }
    }

    const output = runScanPipeline({
      zoneId: 102,
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
        cloudMask: realCloudMask,
      },
    });

    expect(output).toBeDefined();
    expect(output.detections.length).toBeGreaterThan(0);
    expect(output.stats.totalEncroachedAreaM2).toBeGreaterThan(5000);
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
