import { Request, Response } from 'express';
import { getDB } from '../db';
import { appendNotification } from '../services/notification.service';

const STATUS_ORDER = ['New', 'Verified', 'Notice Issued'] as const;
type AlertStatus = typeof STATUS_ORDER[number];

export function getAlerts(req: Request, res: Response): void {
  const db = getDB();
  const { zone, severity, status, page: pageStr, limit: limitStr } = req.query;
  const page = Math.max(1, parseInt(pageStr as string) || 1);
  const limit = Math.min(100, parseInt(limitStr as string) || 50);
  const offset = (page - 1) * limit;

  let query = `
    SELECT a.*, z.name as zone_name, z.risk_level, c.id as case_id, c.case_ref, c.ledger_hash
    FROM alerts a
    LEFT JOIN zones z ON a.zone_id = z.id
    LEFT JOIN cases c ON c.alert_id = a.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (zone) { query += ' AND a.zone_id = ?'; params.push(Number(zone)); }
  if (severity) { query += ' AND a.severity = ?'; params.push(severity as string); }
  if (status) { query += ' AND a.status = ?'; params.push(status as string); }

  query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const alerts = db.prepare(query).all(...params);
  const total = (db.prepare(`
    SELECT COUNT(*) as cnt FROM alerts a WHERE 1=1
    ${zone ? 'AND a.zone_id = ' + Number(zone) : ''}
    ${severity ? "AND a.severity = '" + severity + "'" : ''}
    ${status ? "AND a.status = '" + status + "'" : ''}
  `).get() as { cnt: number }).cnt;

  res.json({ alerts, total, page, limit });
}

export function patchAlertStatus(req: Request, res: Response): void {
  const db = getDB();
  const { id } = req.params;
  const { status, notes } = req.body as { status: AlertStatus; notes?: string };

  const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id) as
    { id: number; status: AlertStatus } | undefined;

  if (!alert) { res.status(404).json({ error: 'Alert not found' }); return; }

  const currentIdx = STATUS_ORDER.indexOf(alert.status as AlertStatus);
  const newIdx = STATUS_ORDER.indexOf(status);

  if (newIdx <= currentIdx) {
    res.status(400).json({ error: `Cannot move from '${alert.status}' to '${status}'. Status must advance forward.` });
    return;
  }

  db.prepare('UPDATE alerts SET status = ? WHERE id = ?').run(status, id);
  db.prepare(`
    INSERT INTO case_history (alert_id, status, changed_by, notes)
    VALUES (?, ?, ?, ?)
  `).run(id, status, req.user!.userId, notes ?? '');

  // Simulated notifications for certain statuses
  if (status === 'Notice Issued') {
    appendNotification('notice', `[SIMULATED] Legal notice issued for alert #${id}`);
  }

  const updated = db.prepare(`
    SELECT a.*, z.name as zone_name, z.risk_level, c.id as case_id, c.case_ref, c.ledger_hash
    FROM alerts a
    LEFT JOIN zones z ON a.zone_id = z.id
    LEFT JOIN cases c ON c.alert_id = a.id
    WHERE a.id = ?
  `).get(id);

  res.json({ alert: updated });
}
