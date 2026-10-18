import { getDB } from '../db';

const ZONES = [
  {
    name: 'Aravalli Forest Reserve Alpha',
    risk_level: 'critical',
    lat: 28.52, lng: 77.08, offset: 0.06,
  },
  {
    name: 'Yamuna Floodplain Sector 7',
    risk_level: 'high',
    lat: 28.67, lng: 77.30, offset: 0.04,
  },
  {
    name: 'Sariska Buffer Zone B',
    risk_level: 'high',
    lat: 27.34, lng: 76.37, offset: 0.05,
  },
  {
    name: 'Ranthambore Peripheral Zone',
    risk_level: 'medium',
    lat: 26.02, lng: 76.50, offset: 0.07,
  },
  {
    name: 'Delhi Ridge Forest Sector C',
    risk_level: 'critical',
    lat: 28.70, lng: 77.10, offset: 0.03,
  },
  {
    name: 'Haryana Agricultural Reserve',
    risk_level: 'medium',
    lat: 28.90, lng: 76.85, offset: 0.08,
  },
  {
    name: 'Bhindawas Wetland Zone',
    risk_level: 'low',
    lat: 28.43, lng: 76.23, offset: 0.04,
  },
  {
    name: 'Mangar Bani Sacred Grove',
    risk_level: 'high',
    lat: 28.38, lng: 77.05, offset: 0.03,
  },
];

function makePolygon(lat: number, lng: number, offset: number): string {
  const coords = [
    [lng - offset, lat - offset],
    [lng + offset, lat - offset],
    [lng + offset, lat + offset],
    [lng - offset, lat + offset],
    [lng - offset, lat - offset],
  ];
  return JSON.stringify({
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
  });
}

export function seedZones(): void {
  const db = getDB();
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM zones').get() as { cnt: number };
  if (existing.cnt > 0) {
    console.log('ℹ️  Zones already seeded, skipping.');
    return;
  }

  const insert = db.prepare(`
    INSERT INTO zones (name, geojson, risk_level) VALUES (?, ?, ?)
  `);

  for (const z of ZONES) {
    insert.run(z.name, makePolygon(z.lat, z.lng, z.offset), z.risk_level);
  }

  console.log(`✅ Seeded ${ZONES.length} risk zones`);
}
