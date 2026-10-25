import { describe, it, expect } from 'vitest';
import { computeNdviPixel } from '../scan/ndvi';
import { speckleFilter3x3 } from '../scan/sar';
import { vectorizeChangeMask } from '../scan/vectorize';
import { createGeotransform } from '../scan/scene';
import { computeCadastralOverlap } from '../scan/overlay';
import { runScanPipeline } from '../scan/pipeline';
import * as turf from '@turf/turf';

describe('SentinelEye Scan Engine Unit Tests', () => {
  it('computes NDVI accurately for known spectral reflectance values', () => {
    // Dense vegetation: NIR=0.8, Red=0.2 -> (0.8 - 0.2) / (0.8 + 0.2) = 0.6
    expect(computeNdviPixel(0.8, 0.2)).toBeCloseTo(0.6, 4);

    // Bare soil: NIR=0.3, Red=0.2 -> (0.3 - 0.2) / 0.5 = 0.2
    expect(computeNdviPixel(0.3, 0.2)).toBeCloseTo(0.2, 4);

    // Water: NIR=0.05, Red=0.15 -> (0.05 - 0.15) / 0.2 = -0.5
    expect(computeNdviPixel(0.05, 0.15)).toBeCloseTo(-0.5, 4);

    // Zero reflectance safety
    expect(computeNdviPixel(0, 0)).toBe(0);
  });

  it('filters 3x3 SAR speckle using 2D median', () => {
    const input = new Float32Array(9);
    input.fill(-15.0);
    input[4] = 0.0; // isolated spike noise in center pixel

    const filtered = speckleFilter3x3(input, 3);
    // Center pixel should be median of -15.0, removing the 0.0 spike
    expect(filtered[4]).toBe(-15.0);
  });

  it('vectorizes connected components and drops sub-threshold blobs', () => {
    const size = 32;
    const mask = new Uint8Array(size * size);
    const ndvi = new Float32Array(size * size);
    const sar = new Float32Array(size * size);
    const conf = new Float32Array(size * size);

    // Blob 1: 4x4 square = 16 pixels * 100m² = 1600m² (> 500m² threshold)
    for (let y = 5; y < 9; y++) {
      for (let x = 5; x < 9; x++) {
        mask[y * size + x] = 1;
        ndvi[y * size + x] = -0.4;
        sar[y * size + x] = 5.0;
        conf[y * size + x] = 0.9;
      }
    }

    // Blob 2: 1 pixel = 100m² (< 500m² threshold -> should be dropped)
    mask[25 * size + 25] = 1;

    const geotransform = createGeotransform({
      minLng: 77.0,
      maxLng: 77.1,
      minLat: 28.5,
      maxLat: 28.6,
    }, size);

    const blobs = vectorizeChangeMask(mask, ndvi, sar, conf, geotransform, size);

    // Only 1 blob should pass minimum area filter
    expect(blobs.length).toBe(1);
    expect(blobs[0].pixelCount).toBe(16);
    expect(blobs[0].areaM2).toBe(1600);
    expect(blobs[0].meanNdviDiff).toBeCloseTo(-0.4, 2);
    expect(blobs[0].meanSarDiff).toBeCloseTo(5.0, 2);
  });

  it('computes exact cadastral polygon overlap using Turf', () => {
    // Hand-crafted 100% overlap square
    const zoneGeoJson = turf.polygon([[
      [77.0, 28.5],
      [77.2, 28.5],
      [77.2, 28.7],
      [77.0, 28.7],
      [77.0, 28.5],
    ]]);

    const blob = {
      id: 1,
      pixelCount: 20,
      areaM2: 2000,
      centroid: [77.1, 28.6] as [number, number],
      coordinates: [
        [77.05, 28.55],
        [77.15, 28.55],
        [77.15, 28.65],
        [77.05, 28.65],
        [77.05, 28.55],
      ] as [number, number][],
      meanNdviDiff: -0.4,
      meanSarDiff: 4.5,
      meanConfidence: 0.88,
    };

    const result = computeCadastralOverlap(blob, zoneGeoJson);
    expect(result.overlapPct).toBe(100);
    expect(result.isInsideBoundary).toBe(true);
  });

  it('demonstrates Optical misses cloud-covered event while Fused catches it', () => {
    const bbox = { minLng: 77.02, maxLng: 77.14, minLat: 28.46, maxLat: 28.58 };
    const zoneGeo = turf.polygon([[
      [77.02, 28.46],
      [77.14, 28.46],
      [77.14, 28.58],
      [77.02, 28.58],
      [77.02, 28.46],
    ]]);

    // Cloud target coordinate is pixel (130, 130) -> mapped to lat/lng
    const targetLng = 77.02 + (130 / 256) * (77.14 - 77.02);
    const targetLat = 28.58 - (130 / 256) * (28.58 - 28.46);

    // Run Optical mode under heavy cloud cover (75%)
    const opticalResult = runScanPipeline({
      zoneId: 1,
      bbox,
      zoneGeoJson: zoneGeo,
      mode: 'optical',
      cloudCoverage: 75,
      seed: 42,
    });

    // Run Fused mode under identical heavy cloud cover (75%)
    const fusedResult = runScanPipeline({
      zoneId: 1,
      bbox,
      zoneGeoJson: zoneGeo,
      mode: 'fused',
      cloudCoverage: 75,
      seed: 42,
    });

    const isNearTarget = (d: { centroid: [number, number] }) => {
      const dist = Math.hypot(d.centroid[0] - targetLng, d.centroid[1] - targetLat);
      return dist < 0.02; // within ~2km
    };

    const opticalFoundTarget = opticalResult.detections.some(isNearTarget);
    const fusedFoundTarget = fusedResult.detections.some(isNearTarget);

    // Optical fails because cloud mask occludes optical bands
    expect(opticalFoundTarget).toBe(false);

    // Fused succeeds because SAR penetrates cloud
    expect(fusedFoundTarget).toBe(true);
  });

  it('rejects seasonal crop harvesting as false-positive in Fused mode', () => {
    const bbox = { minLng: 77.02, maxLng: 77.14, minLat: 28.46, maxLat: 28.58 };
    const zoneGeo = turf.polygon([[
      [77.02, 28.46],
      [77.14, 28.46],
      [77.14, 28.58],
      [77.02, 28.58],
      [77.02, 28.46],
    ]]);

    const fusedResult = runScanPipeline({
      zoneId: 1,
      bbox,
      zoneGeoJson: zoneGeo,
      mode: 'fused',
      cloudCoverage: 15,
      seed: 42,
    });

    // Rejection counter must be >= 1 (seasonal farming patch rejected)
    expect(fusedResult.stats.rejectedCount).toBeGreaterThanOrEqual(1);
  });
});
