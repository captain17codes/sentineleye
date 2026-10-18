import { Request, Response } from 'express';
import { getDB } from '../db';

export function getRiskStats(_req: Request, res: Response): void {
  const db = getDB();

  // Totals
  const totals = db.prepare(`
    SELECT
      COUNT(*) as total_alerts,
      COALESCE(SUM(area_m2), 0) as total_area_m2,
      SUM(CASE WHEN severity = 'CRITICAL' THEN 1 ELSE 0 END) as critical,
      SUM(CASE WHEN severity = 'HIGH' THEN 1 ELSE 0 END) as high,
      SUM(CASE WHEN severity = 'MEDIUM' THEN 1 ELSE 0 END) as medium,
      SUM(CASE WHEN severity = 'LOW' THEN 1 ELSE 0 END) as low,
      SUM(CASE WHEN status = 'New' THEN 1 ELSE 0 END) as new_count,
      SUM(CASE WHEN status = 'Verified' THEN 1 ELSE 0 END) as verified,
      SUM(CASE WHEN status = 'Notice Issued' THEN 1 ELSE 0 END) as notice_issued
    FROM alerts
  `).get();

  // By class
  const byClass = db.prepare(`
    SELECT class, COUNT(*) as count, COALESCE(SUM(area_m2), 0) as total_area_m2
    FROM alerts
    GROUP BY class
  `).all();

  // By zone
  const byZone = db.prepare(`
    SELECT z.id, z.name, z.risk_level,
      COUNT(a.id) as alert_count,
      COALESCE(SUM(a.area_m2), 0) as total_area_m2,
      SUM(CASE WHEN a.severity = 'CRITICAL' THEN 4
               WHEN a.severity = 'HIGH' THEN 3
               WHEN a.severity = 'MEDIUM' THEN 2
               ELSE 1 END) as risk_score
    FROM zones z
    LEFT JOIN alerts a ON z.id = a.zone_id
    GROUP BY z.id
    ORDER BY risk_score DESC
  `).all();

  // By severity (for donut chart)
  const bySeverity = db.prepare(`
    SELECT severity, COUNT(*) as count FROM alerts GROUP BY severity
  `).all();

  // By day (last 30 days trend)
  const byDay = db.prepare(`
    SELECT date(created_at) as day, COUNT(*) as count, COALESCE(SUM(area_m2), 0) as area_m2
    FROM alerts
    WHERE created_at >= date('now', '-30 days')
    GROUP BY day
    ORDER BY day ASC
  `).all();

  // Scan stats
  const scanStats = db.prepare(`
    SELECT COUNT(*) as total_scans,
      AVG(change_score) as avg_change_score,
      SUM(CASE WHEN scene_type = 'optical' THEN 1 ELSE 0 END) as optical,
      SUM(CASE WHEN scene_type = 'sar' THEN 1 ELSE 0 END) as sar,
      SUM(CASE WHEN scene_type = 'fused' THEN 1 ELSE 0 END) as fused
    FROM scans
  `).get();

  res.json({ totals, byClass, byZone, bySeverity, byDay, scanStats });
}
