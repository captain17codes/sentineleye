/**
 * Planted Ground-Truth Scenarios per zone.
 * Deterministic and repeatable for demos and unit tests.
 */

export interface GroundTruthScenario {
  id: string;
  name: string;
  x: number; // pixel center [0..255]
  y: number;
  radius: number; // in pixels
  dNDVI: number; // delta NDVI
  dSAR: number; // delta SAR backscatter in dB
  expectedClass: 'Unauthorized Construction' | 'Mining' | 'Deforestation' | 'Seasonal Farming';
  isFalsePositive: boolean; // should be rejected by fusion filter
  isUnderCloudTarget?: boolean; // planted specifically under the cloud cluster
}

export const BASE_SCENARIOS: GroundTruthScenario[] = [
  {
    id: 'concrete-core',
    name: 'Unauthorized Warehouse Complex',
    x: 80,
    y: 90,
    radius: 14,
    dNDVI: -0.42,
    dSAR: +5.8, // Heavy double-bounce
    expectedClass: 'Unauthorized Construction',
    isFalsePositive: false,
  },
  {
    id: 'quarry-pit',
    name: 'Illegal Quartzite Quarry Pit',
    x: 175,
    y: 75,
    radius: 16,
    dNDVI: -0.48,
    dSAR: +3.6, // Rough surface disturbance
    expectedClass: 'Mining',
    isFalsePositive: false,
  },
  {
    id: 'clearcut-woodland',
    name: 'Protected Forest Canopy Clearing',
    x: 185,
    y: 180,
    radius: 18,
    dNDVI: -0.52,
    dSAR: -1.2, // Canopy removal reduces volume scattering
    expectedClass: 'Deforestation',
    isFalsePositive: false,
  },
  {
    id: 'seasonal-crop-harvest',
    name: 'Seasonal Mustard/Wheat Harvest Patch',
    x: 60,
    y: 190,
    radius: 12,
    dNDVI: -0.38,
    dSAR: +0.7, // Smooth soil, very low SAR change -> FALSE POSITIVE
    expectedClass: 'Seasonal Farming',
    isFalsePositive: true,
  },
  {
    id: 'cloud-covered-structure',
    name: 'Cloud-Covered Boundary Encroachment',
    x: 130,
    y: 130,
    radius: 13,
    dNDVI: -0.45,
    dSAR: +5.2, // Strong double bounce
    expectedClass: 'Unauthorized Construction',
    isFalsePositive: false,
    isUnderCloudTarget: true,
  },
  {
    id: 'noise-speckle-1',
    name: 'Sensor Speckle Noise',
    x: 220,
    y: 220,
    radius: 2, // < min area -> filtered out
    dNDVI: -0.35,
    dSAR: +4.0,
    expectedClass: 'Unauthorized Construction',
    isFalsePositive: true,
  },
];

export function getZoneScenarios(zoneId: number): GroundTruthScenario[] {
  // Deterministic slight offset per zone so zones don't look completely identical
  const offset = (zoneId * 17) % 20;
  return BASE_SCENARIOS.map((s) => ({
    ...s,
    x: (s.x + offset) % 230 + 15,
    y: (s.y + offset) % 230 + 15,
  }));
}
