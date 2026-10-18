import { Request, Response } from 'express';
import { getDB } from '../db';
import { appendNotification } from '../services/notification.service';

const ALERT_THRESHOLD = 0.35;

export function createScan(req: Request, res: Response): void {
  const db = getDB();
  const { zone_id, scene_type, cloud_coverage, raw_classes, validated_classes, change_score, lat, lng } = req.body;

  const result = db.prepare(`
    INSERT INTO scans (zone_id, scene_type, cloud_coverage, raw_classes, validated_classes, change_score, operator_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    zone_id, scene_type, cloud_coverage,
    JSON.stringify(raw_classes), JSON.stringify(validated_classes),
    change_score, req.user!.userId
  );

  const scanId = result.lastInsertRowid as number;

  // Auto-create alert if change_score exceeds threshold
  let alertId: number | null = null;
  if (change_score >= ALERT_THRESHOLD) {
    const zone = db.prepare('SELECT * FROM zones WHERE id = ?').get(zone_id) as
      { name: string; risk_level: string } | undefined;

    const severity = change_score >= 0.8 ? 'CRITICAL'
      : change_score >= 0.6 ? 'HIGH'
      : change_score >= 0.4 ? 'MEDIUM' : 'LOW';

    // Determine dominant class and metrics
    const topBlob = validated_classes?.[0] ?? raw_classes?.[0] ?? {};
    const topClass = topBlob.class || 'Land Encroachment';
    const area_m2 = topBlob.area_m2 || 3850;
    const overlap_pct = topBlob.overlap_pct || 86.4;
    const before_img = topBlob.beforeCrop || req.body.before_img || null;
    const after_img = topBlob.afterCrop || req.body.after_img || null;

    const description = `[SIMULATED] ${topClass} encroachment detected in ${zone?.name ?? 'Zone ' + zone_id} via ${scene_type} imagery. Change score: ${(change_score * 100).toFixed(1)}% (${area_m2} m²)`;

    const alertResult = db.prepare(`
      INSERT INTO alerts (scan_id, zone_id, severity, lat, lng, description, class, area_m2, overlap_pct, before_img, after_img)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(scanId, zone_id, severity, lat ?? 0, lng ?? 0, description, topClass, area_m2, overlap_pct, before_img, after_img);

    alertId = alertResult.lastInsertRowid as number;

    appendNotification('alert', `[SIMULATED] New ${severity} alert created for zone ${zone?.name ?? zone_id}: ${topClass}`);
  }

  const scan = db.prepare('SELECT * FROM scans WHERE id = ?').get(scanId);
  res.status(201).json({ scan, alertCreated: alertId !== null, alertId });
}

export function getScans(req: Request, res: Response): void {
  const db = getDB();
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
  const offset = (page - 1) * limit;

  const scans = db.prepare(`
    SELECT s.*, z.name as zone_name, u.email as operator_email
    FROM scans s
    LEFT JOIN zones z ON s.zone_id = z.id
    LEFT JOIN users u ON s.operator_id = u.id
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  const total = (db.prepare('SELECT COUNT(*) as cnt FROM scans').get() as { cnt: number }).cnt;
  res.json({ scans, total, page, limit });
}
