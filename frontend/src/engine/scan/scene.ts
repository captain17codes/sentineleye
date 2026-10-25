/**
 * Deterministic synthetic 256x256 multi-band scene generator.
 * Bands:
 *   - Red (Optical B4): 0.0 .. 1.0
 *   - NIR (Optical B8): 0.0 .. 1.0
 *   - SAR_VV (dB): -25.0 .. 0.0 dB
 * Geotransform: Maps pixel (px, py) <-> (lng, lat)
 */

import { SCENE } from '../config';
import { getZoneScenarios, GroundTruthScenario } from './scenarios';
import { generatePerlinNoise2D } from './cloud';

export interface BoundingBox {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

export interface Geotransform {
  pixelToLatLng: (x: number, y: number) => [number, number]; // [lng, lat]
  latLngToPixel: (lng: number, lat: number) => [number, number]; // [x, y]
  bbox: BoundingBox;
}

export interface SceneBands {
  red: Float32Array;
  nir: Float32Array;
  sar: Float32Array;
}

export interface BitemporalScene {
  size: number;
  t0: SceneBands;
  t1: SceneBands;
  geotransform: Geotransform;
  scenarios: GroundTruthScenario[];
}

export function createGeotransform(bbox: BoundingBox, size = SCENE.SIZE): Geotransform {
  const lngRange = bbox.maxLng - bbox.minLng;
  const latRange = bbox.maxLat - bbox.minLat;

  return {
    bbox,
    pixelToLatLng: (x: number, y: number) => {
      const lng = bbox.minLng + (x / size) * lngRange;
      const lat = bbox.maxLat - (y / size) * latRange; // top row is maxLat
      return [lng, lat];
    },
    latLngToPixel: (lng: number, lat: number) => {
      const x = Math.round(((lng - bbox.minLng) / lngRange) * size);
      const y = Math.round(((bbox.maxLat - lat) / latRange) * size);
      return [x, y];
    },
  };
}

export function generateBitemporalScene(
  zoneId: number,
  bbox: BoundingBox,
  seed: number,
  size = SCENE.SIZE
): BitemporalScene {
  const total = size * size;

  // Base terrain noise
  const vegNoise = generatePerlinNoise2D(size, 4.0, seed + 1);
  const soilNoise = generatePerlinNoise2D(size, 6.0, seed + 2);
  const sarNoise = generatePerlinNoise2D(size, 10.0, seed + 3);

  // T0 bands (Baseline)
  const redT0 = new Float32Array(total);
  const nirT0 = new Float32Array(total);
  const sarT0 = new Float32Array(total);

  // T1 bands (Current - starts as copy of T0)
  const redT1 = new Float32Array(total);
  const nirT1 = new Float32Array(total);
  const sarT1 = new Float32Array(total);

  for (let i = 0; i < total; i++) {
    const veg = vegNoise[i];
    const soil = soilNoise[i];

    // High vegetation: Low red, High NIR (NDVI ~ 0.5-0.7)
    // Bare soil: Modest red, Modest NIR (NDVI ~ 0.1-0.2)
    redT0[i] = 0.08 + (1 - veg) * 0.15 + soil * 0.05;
    nirT0[i] = 0.25 + veg * 0.45;
    sarT0[i] = -16.0 + sarNoise[i] * 6.0; // Typical vegetated soil -16 to -10 dB

    redT1[i] = redT0[i];
    nirT1[i] = nirT0[i];
    sarT1[i] = sarT0[i];
  }

  // Plant ground truth scenarios into T1
  const scenarios = getZoneScenarios(zoneId);

  for (const sc of scenarios) {
    const rSq = sc.radius * sc.radius;
    for (let dy = -sc.radius; dy <= sc.radius; dy++) {
      for (let dx = -sc.radius; dx <= sc.radius; dx++) {
        const distSq = dx * dx + dy * dy;
        if (distSq <= rSq) {
          const px = sc.x + dx;
          const py = sc.y + dy;
          if (px >= 0 && px < size && py >= 0 && py < size) {
            const idx = py * size + px;
            const weight = 1 - Math.sqrt(distSq) / sc.radius; // smooth feather at edges

            // Modify T1 bands according to planted scenario
            // dNDVI < 0 means veg dropped -> NIR drops, Red increases
            const deltaVeg = sc.dNDVI * weight;
            nirT1[idx] = Math.max(0.04, nirT1[idx] + deltaVeg * 0.6);
            redT1[idx] = Math.min(0.45, redT1[idx] - deltaVeg * 0.35);

            // Modify SAR
            sarT1[idx] = sarT1[idx] + sc.dSAR * weight;
          }
        }
      }
    }
  }

  const geotransform = createGeotransform(bbox, size);

  return {
    size,
    t0: { red: redT0, nir: nirT0, sar: sarT0 },
    t1: { red: redT1, nir: nirT1, sar: sarT1 },
    geotransform,
    scenarios,
  };
}
