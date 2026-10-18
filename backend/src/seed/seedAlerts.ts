import { getDB } from '../db';
import zlib from 'zlib';
import { appendLedger } from '../services/ledger.service';

function createTerrainPngDataUrl(type: 'before' | 'after', seed: number): string {
  const width = 64;
  const height = 64;
  const raw = Buffer.alloc(height * (1 + width * 3));

  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const idx = y * (1 + width * 3) + 1 + x * 3;
      const noise = ((Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453) % 1 + 1) % 1;
      
      if (type === 'before') {
        // Natural vegetative terrain (green / earthy)
        raw[idx]     = Math.floor(25 + noise * 40);  // R
        raw[idx + 1] = Math.floor(95 + noise * 70);  // G
        raw[idx + 2] = Math.floor(30 + noise * 35);  // B
      } else {
        // After: Anomaly intrusion (red / bright construction / cleared soil)
        const isAnomaly = (x > 20 && x < 48 && y > 18 && y < 46);
        if (isAnomaly) {
          raw[idx]     = Math.floor(220 + noise * 35); // Bright Red/Alert
          raw[idx + 1] = Math.floor(40 + noise * 30);
          raw[idx + 2] = Math.floor(40 + noise * 30);
        } else {
          raw[idx]     = Math.floor(25 + noise * 40);
          raw[idx + 1] = Math.floor(95 + noise * 70);
          raw[idx + 2] = Math.floor(30 + noise * 35);
        }
      }
    }
  }

  const compressed = zlib.deflateSync(raw);

  function chunk(typeStr: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(typeStr, 'ascii');
    const crc = zlib.crc32(Buffer.concat([t, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, t, data, crcBuf]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const pngBuf = Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  return `data:image/png;base64,${pngBuf.toString('base64')}`;
}

const CLASSES = ['Deforestation', 'Unauthorized Construction', 'Mining', 'Land Encroachment'] as const;
const STATUSES = ['New', 'Verified', 'Notice Issued'] as const;

// Realistic uneven severity mix: Critical ~15% (6), High ~26% (10), Medium ~34% (13), Low ~24% (9)
const SEED_SEVERITIES: Array<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'> = [
  'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'MEDIUM',
  'LOW', 'HIGH', 'MEDIUM', 'LOW', 'HIGH', 'MEDIUM', 'CRITICAL', 'HIGH',
  'MEDIUM', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'MEDIUM', 'LOW', 'HIGH',
  'MEDIUM', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL',
  'MEDIUM', 'LOW', 'HIGH', 'MEDIUM', 'LOW', 'MEDIUM'
];

// Realistic clustered dates over 30 days: quiet intervals, couple of distinct spikes
// Spike 1 around day 21-22 (6 alerts), Spike 2 around day 6-7 (7 alerts), Mini-spike day 2-3 (5 alerts), remainder scattered
const SEED_DAYS_AGO: number[] = [
  29, 27, 25, 24, 22, 22, 21, 21, 21, 20, // 10 alerts
  18, 17, 16, 14, 13, 12, 11, 9, 8, 7,   // 10 alerts
  7, 7, 6, 6, 6, 5, 4, 3, 3, 3,          // 10 alerts
  2, 2, 2, 1, 1, 0, 0, 0                 // 8 alerts (Total = 38)
];

export function seedAlerts(force: boolean = true): void {
  const db = getDB();

  // If alerts already seeded and not force, check count
  if (!force) {
    const existing = db.prepare('SELECT COUNT(*) as cnt FROM alerts').get() as { cnt: number };
    if (existing.cnt >= 30) {
      console.log('ℹ️  Alerts already seeded (count >= 30), skipping.');
      return;
    }
  }

  // Clear legacy mock alerts and dependent tables
  db.prepare('DELETE FROM case_history').run();
  db.prepare('DELETE FROM ledger').run();
  db.prepare('DELETE FROM cases').run();
  db.prepare('DELETE FROM alerts').run();

  const zones = db.prepare('SELECT id, name, geojson FROM zones').all() as Array<{
    id: number;
    name: string;
    geojson: string;
  }>;

  if (zones.length === 0) {
    console.log('⚠️  No zones found to seed alerts.');
    return;
  }

  const insertAlert = db.prepare(`
    INSERT INTO alerts (
      zone_id, class, severity, status, lat, lng,
      area_m2, overlap_pct, before_img, after_img,
      description, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCase = db.prepare(`
    INSERT INTO cases (alert_id, case_ref, created_by, created_at, ledger_hash)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertHistory = db.prepare(`
    INSERT INTO case_history (alert_id, status, changed_by, changed_at, notes)
    VALUES (?, ?, ?, ?, ?)
  `);

  console.log('🌱 Seeding 38 realistic alerts with clustered 30-day timeline and uneven severity mix...');

  const operator = db.prepare("SELECT id, email FROM users WHERE role = 'operator' LIMIT 1").get() as {
    id: number;
    email: string;
  } | undefined;
  const operatorId = operator?.id ?? 1;

  for (let i = 0; i < 38; i++) {
    const zone = zones[i % zones.length];
    const geo = JSON.parse(zone.geojson);
    const centerLng = geo.geometry.coordinates[0][0][0] + 0.02;
    const centerLat = geo.geometry.coordinates[0][0][1] + 0.02;

    const latOffset = (Math.sin(i * 17) * 0.035);
    const lngOffset = (Math.cos(i * 23) * 0.035);
    const lat = parseFloat((centerLat + latOffset).toFixed(6));
    const lng = parseFloat((centerLng + lngOffset).toFixed(6));

    const cls = CLASSES[i % CLASSES.length];
    const severity = SEED_SEVERITIES[i];
    const status = STATUSES[i % STATUSES.length];

    // Clustered realistic timestamps
    const daysAgo = SEED_DAYS_AGO[i];
    const hoursAgo = ((i * 7) % 23);
    const createdDate = new Date(Date.now() - (daysAgo * 86400000 + hoursAgo * 3600000));
    const createdAt = createdDate.toISOString();

    const area_m2 = Math.floor(1200 + ((i * 1337) % 32000));
    const overlap_pct = parseFloat((72 + ((i * 7) % 26)).toFixed(1));

    const beforeImg = createTerrainPngDataUrl('before', i * 41);
    const afterImg = createTerrainPngDataUrl('after', i * 41 + 100);

    const desc = `${cls} identified in ${zone.name}. Footprint: ${area_m2} m² (${overlap_pct}% inside protected bounds).`;

    const result = insertAlert.run(
      zone.id,
      cls,
      severity,
      status,
      lat,
      lng,
      area_m2,
      overlap_pct,
      beforeImg,
      afterImg,
      desc,
      createdAt
    );

    const alertId = result.lastInsertRowid as number;

    // Create case history entry
    insertHistory.run(alertId, 'New', operatorId, createdAt, 'Initial satellite bitemporal detection');

    if (status !== 'New') {
      insertHistory.run(alertId, 'Verified', operatorId, new Date(createdDate.getTime() + 1800000).toISOString(), 'Spectral validation confirmed anomaly');
    }
    if (status === 'Notice Issued') {
      insertHistory.run(alertId, 'Notice Issued', operatorId, new Date(createdDate.getTime() + 14400000).toISOString(), 'Statutory legal draft notice generated');
    }

    // For non-New alerts, create formal case and append to cryptographic ledger
    if (status !== 'New') {
      const caseYear = createdDate.getFullYear();
      const caseRef = `CASE-${caseYear}-${String(alertId).padStart(4, '0')}`;

      const ledgerPayload = {
        case_ref: caseRef,
        alert_id: alertId,
        zone: zone.name,
        lat,
        lng,
        severity,
        class: cls,
        area_m2,
        overlap_pct,
        timestamp: createdAt,
      };

      // Create case first
      const caseRes = insertCase.run(alertId, caseRef, operatorId, createdAt, '');
      const caseId = caseRes.lastInsertRowid as number;

      // Append to ledger and backfill hash
      const hash = appendLedger(caseId, ledgerPayload);
      db.prepare('UPDATE cases SET ledger_hash = ? WHERE id = ?').run(hash, caseId);
    }
  }

  console.log('✅ Seeded 36 realistic alerts with cases and cryptographic ledger chain.');
}
