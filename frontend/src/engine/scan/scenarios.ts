/**
 * Planted Ground-Truth Scenarios per zone.
 * Deterministic and repeatable for demos, unit tests, and real seed generation.
 */

export interface GroundTruthScenario {
  id: string;
  name: string;
  x: number; // pixel center [0..255]
  y: number;
  radius: number; // in pixels
  dNDVI: number; // delta NDVI
  dSAR: number; // delta SAR backscatter in dB
  expectedClass: 'Unauthorized Construction' | 'Mining' | 'Deforestation' | 'Land Encroachment' | 'Seasonal Farming';
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

/**
 * 38 plant scenarios calibrated across the 8 ecological zones.
 * Distribution: 6 Critical, 14 High, 11 Medium, 7 Low.
 * Each zone also has 1 seasonal false-positive scenario (rejected by SAR fusion filter).
 */
export const ZONE_SCENARIOS: Record<number, GroundTruthScenario[]> = {
  // ── Zone 101: Delhi Ridge Forest Sector C (5 alerts: 2 Critical, 2 High, 1 Medium) ──
  101: [
    { id: 'z101-1', name: 'Ridge Core Quartzite Quarry', x: 128, y: 125, radius: 12.0, dNDVI: -0.48, dSAR: +3.8, expectedClass: 'Mining', isFalsePositive: false },
    { id: 'z101-2', name: 'Sector C Commercial Complex Plinth', x: 180, y: 75, radius: 12.0, dNDVI: -0.44, dSAR: +5.4, expectedClass: 'Unauthorized Construction', isFalsePositive: false },
    { id: 'z101-3', name: 'Ridge Boundary Workshop Depot', x: 75, y: 75, radius: 8.5, dNDVI: -0.42, dSAR: +5.1, expectedClass: 'Unauthorized Construction', isFalsePositive: false },
    { id: 'z101-4', name: 'Southern Ridge Quarry Excavation', x: 180, y: 180, radius: 8.5, dNDVI: -0.40, dSAR: +3.5, expectedClass: 'Mining', isFalsePositive: false },
    { id: 'z101-5', name: 'Canopy Thinning Sector C', x: 75, y: 180, radius: 6.8, dNDVI: -0.38, dSAR: +3.0, expectedClass: 'Deforestation', isFalsePositive: false },
    { id: 'z101-fp', name: 'Seasonal Ridge Grass Clearing', x: 40, y: 128, radius: 8, dNDVI: -0.36, dSAR: +0.6, expectedClass: 'Seasonal Farming', isFalsePositive: true },
  ],

  // ── Zone 102: Mangar Bani Sacred Grove (5 alerts: 2 Critical, 2 High, 1 Medium) ──
  102: [
    { id: 'z102-1', name: 'Sacred Grove Core Deforestation', x: 128, y: 125, radius: 12.5, dNDVI: -0.52, dSAR: +3.2, expectedClass: 'Deforestation', isFalsePositive: false },
    { id: 'z102-2', name: 'Mangar Hillside Stone Quarry', x: 180, y: 75, radius: 12.0, dNDVI: -0.45, dSAR: +3.9, expectedClass: 'Mining', isFalsePositive: false },
    { id: 'z102-3', name: 'Illegal Resort Concrete Foundation', x: 75, y: 75, radius: 8.5, dNDVI: -0.42, dSAR: +5.6, expectedClass: 'Unauthorized Construction', isFalsePositive: false },
    { id: 'z102-4', name: 'Mangar Western Boundary Wall Encroachment', x: 180, y: 180, radius: 8.5, dNDVI: -0.41, dSAR: +4.8, expectedClass: 'Unauthorized Construction', isFalsePositive: false },
    { id: 'z102-5', name: 'Buffering Woodland Road Cut', x: 75, y: 180, radius: 6.8, dNDVI: -0.36, dSAR: +3.0, expectedClass: 'Deforestation', isFalsePositive: false },
    { id: 'z102-fp', name: 'Grove Fallow Soil Exposure', x: 40, y: 128, radius: 7, dNDVI: -0.34, dSAR: +0.5, expectedClass: 'Seasonal Farming', isFalsePositive: true },
  ],

  // ── Zone 103: Yamuna Floodplain Sector 7 (5 alerts: 1 Critical, 2 High, 1 Medium, 1 Low) ──
  103: [
    { id: 'z103-1', name: 'Floodplain Concrete Batching Plant', x: 128, y: 125, radius: 12.0, dNDVI: -0.46, dSAR: +5.9, expectedClass: 'Unauthorized Construction', isFalsePositive: false },
    { id: 'z103-2', name: 'Riverbed Sand Dredging Depot', x: 180, y: 75, radius: 8.5, dNDVI: -0.44, dSAR: +3.6, expectedClass: 'Mining', isFalsePositive: false },
    { id: 'z103-3', name: 'Sector 7 Commercial Warehouse Plinth', x: 75, y: 75, radius: 8.5, dNDVI: -0.40, dSAR: +5.2, expectedClass: 'Unauthorized Construction', isFalsePositive: false },
    { id: 'z103-4', name: 'Embankment Floodplain Silt Dig', x: 75, y: 180, radius: 6.8, dNDVI: -0.35, dSAR: +3.1, expectedClass: 'Land Encroachment', isFalsePositive: false },
    { id: 'z103-5', name: 'Riparian Scrub Disturbance', x: 180, y: 180, radius: 5.5, dNDVI: -0.33, dSAR: +2.8, expectedClass: 'Land Encroachment', isFalsePositive: false },
    { id: 'z103-fp', name: 'Floodplain Melon Harvest Patch', x: 40, y: 128, radius: 8, dNDVI: -0.35, dSAR: +0.7, expectedClass: 'Seasonal Farming', isFalsePositive: true },
  ],

  // ── Zone 104: Asola Bhatti Wildlife Sanctuary (5 alerts: 1 Critical, 2 High, 2 Medium) ──
  104: [
    { id: 'z104-1', name: 'Sanctuary Core Deep Excavation', x: 128, y: 125, radius: 12.0, dNDVI: -0.49, dSAR: +3.7, expectedClass: 'Mining', isFalsePositive: false },
    { id: 'z104-2', name: 'Southern Farmhouse Encroachment', x: 180, y: 75, radius: 8.5, dNDVI: -0.43, dSAR: +5.4, expectedClass: 'Unauthorized Construction', isFalsePositive: false },
    { id: 'z104-3', name: 'Asola Mine Pit Re-activation', x: 75, y: 75, radius: 8.5, dNDVI: -0.42, dSAR: +3.4, expectedClass: 'Mining', isFalsePositive: false },
    { id: 'z104-4', name: 'Wildlife Corridor Enclosure', x: 75, y: 180, radius: 6.8, dNDVI: -0.36, dSAR: +3.1, expectedClass: 'Land Encroachment', isFalsePositive: false },
    { id: 'z104-5', name: 'Scrub Forest Biomass Clearing', x: 180, y: 180, radius: 6.8, dNDVI: -0.37, dSAR: +3.0, expectedClass: 'Deforestation', isFalsePositive: false },
    { id: 'z104-fp', name: 'Peripheral Grazing Patch', x: 40, y: 128, radius: 7, dNDVI: -0.33, dSAR: +0.6, expectedClass: 'Seasonal Farming', isFalsePositive: true },
  ],

  // ── Zone 105: Aravalli Forest Reserve (5 alerts: 0 Critical, 3 High, 1 Medium, 1 Low) ──
  105: [
    { id: 'z105-1', name: 'Aravalli Quartzite Crushing Yard', x: 128, y: 125, radius: 8.5, dNDVI: -0.45, dSAR: +5.5, expectedClass: 'Unauthorized Construction', isFalsePositive: false },
    { id: 'z105-2', name: 'Reserve Illegal Stone Extraction Pit', x: 180, y: 75, radius: 8.5, dNDVI: -0.42, dSAR: +3.8, expectedClass: 'Mining', isFalsePositive: false },
    { id: 'z105-3', name: 'Gwal Pahari Godown Complex', x: 75, y: 75, radius: 8.5, dNDVI: -0.41, dSAR: +5.1, expectedClass: 'Unauthorized Construction', isFalsePositive: false },
    { id: 'z105-4', name: 'Aravalli Ridge Track Cutting', x: 75, y: 180, radius: 6.8, dNDVI: -0.35, dSAR: +3.1, expectedClass: 'Land Encroachment', isFalsePositive: false },
    { id: 'z105-5', name: 'Reserve Peripheral Scrub Clearing', x: 180, y: 180, radius: 5.5, dNDVI: -0.33, dSAR: +2.8, expectedClass: 'Land Encroachment', isFalsePositive: false },
    { id: 'z105-fp', name: 'Fallow Ridge Contour', x: 40, y: 128, radius: 7, dNDVI: -0.34, dSAR: +0.6, expectedClass: 'Seasonal Farming', isFalsePositive: true },
  ],

  // ── Zone 106: Sariska Buffer Zone B (5 alerts: 0 Critical, 2 High, 2 Medium, 1 Low) ──
  106: [
    { id: 'z106-1', name: 'Sariska Marble Quarry Boundary Pit', x: 128, y: 125, radius: 8.5, dNDVI: -0.46, dSAR: +3.7, expectedClass: 'Mining', isFalsePositive: false },
    { id: 'z106-2', name: 'Buffer Zone Masonry Depot', x: 180, y: 75, radius: 8.5, dNDVI: -0.43, dSAR: +5.3, expectedClass: 'Unauthorized Construction', isFalsePositive: false },
    { id: 'z106-3', name: 'Buffer Woodland Clearing for Grazing', x: 75, y: 75, radius: 6.8, dNDVI: -0.38, dSAR: +3.0, expectedClass: 'Deforestation', isFalsePositive: false },
    { id: 'z106-4', name: 'Sariska Boundary Bund Berm', x: 75, y: 180, radius: 6.8, dNDVI: -0.36, dSAR: +3.1, expectedClass: 'Land Encroachment', isFalsePositive: false },
    { id: 'z106-5', name: 'Buffer Perimeter Vegetation Disturbance', x: 180, y: 180, radius: 5.5, dNDVI: -0.32, dSAR: +2.8, expectedClass: 'Land Encroachment', isFalsePositive: false },
    { id: 'z106-fp', name: 'Buffer Mustard Harvest', x: 40, y: 128, radius: 8, dNDVI: -0.35, dSAR: +0.7, expectedClass: 'Seasonal Farming', isFalsePositive: true },
  ],

  // ── Zone 107: Bhindawas Wetland Zone (4 alerts: 0 Critical, 1 High, 2 Medium, 1 Low) ──
  107: [
    { id: 'z107-1', name: 'Wetland Buffer Brick Kiln Excavation', x: 128, y: 125, radius: 8.5, dNDVI: -0.43, dSAR: +3.6, expectedClass: 'Mining', isFalsePositive: false },
    { id: 'z107-2', name: 'Wetland Drainage Bund Encroachment', x: 180, y: 75, radius: 6.8, dNDVI: -0.37, dSAR: +3.1, expectedClass: 'Land Encroachment', isFalsePositive: false },
    { id: 'z107-3', name: 'Wetland Reeds & Marshland Clearing', x: 75, y: 75, radius: 6.8, dNDVI: -0.39, dSAR: +3.0, expectedClass: 'Deforestation', isFalsePositive: false },
    { id: 'z107-4', name: 'Perimeter Bund Berm Disturbance', x: 180, y: 180, radius: 5.5, dNDVI: -0.31, dSAR: +2.8, expectedClass: 'Land Encroachment', isFalsePositive: false },
    { id: 'z107-fp', name: 'Wetland Silt Drying Bed', x: 40, y: 128, radius: 7, dNDVI: -0.34, dSAR: +0.5, expectedClass: 'Seasonal Farming', isFalsePositive: true },
  ],

  // ── Zone 108: Haryana Agricultural Reserve (4 alerts: 0 Critical, 0 High, 1 Medium, 3 Low) ──
  108: [
    { id: 'z108-1', name: 'Reserve Commercial Storage Yard Plinth', x: 128, y: 125, radius: 6.8, dNDVI: -0.38, dSAR: +3.1, expectedClass: 'Land Encroachment', isFalsePositive: false },
    { id: 'z108-2', name: 'Reserve Peripheral Road Cutting', x: 180, y: 75, radius: 5.5, dNDVI: -0.32, dSAR: +2.8, expectedClass: 'Land Encroachment', isFalsePositive: false },
    { id: 'z108-3', name: 'Drainage Channel Disturbance', x: 75, y: 75, radius: 5.5, dNDVI: -0.33, dSAR: +2.8, expectedClass: 'Land Encroachment', isFalsePositive: false },
    { id: 'z108-4', name: 'Boundary Tree Line Removal', x: 180, y: 180, radius: 5.5, dNDVI: -0.35, dSAR: +2.8, expectedClass: 'Deforestation', isFalsePositive: false },
    { id: 'z108-fp', name: 'Paddy Stubble Clearing', x: 40, y: 128, radius: 8, dNDVI: -0.36, dSAR: +0.6, expectedClass: 'Seasonal Farming', isFalsePositive: true },
  ],
};

export function getZoneScenarios(zoneId: number): GroundTruthScenario[] {
  if (ZONE_SCENARIOS[zoneId]) {
    return ZONE_SCENARIOS[zoneId];
  }
  // Deterministic slight offset per zone so unknown zones don't look completely identical
  const offset = (zoneId * 17) % 20;
  return BASE_SCENARIOS.map((s) => ({
    ...s,
    x: ((s.x + offset) % 230) + 15,
    y: ((s.y + offset) % 230) + 15,
  }));
}
