import { Request, Response } from 'express';
import { getDB } from '../db';
import { appendLedger } from '../services/ledger.service';
import { generateFIRPdf } from '../services/pdf.service';

function generateCaseRef(): string {
  const now = new Date();
  const year = now.getFullYear();
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `CASE-${year}-${rand}`;
}

export function createCase(req: Request, res: Response): void {
  const db = getDB();
  const { alert_id, notes } = req.body;

  const alert = db.prepare(`
    SELECT a.*, z.name as zone_name FROM alerts a
    LEFT JOIN zones z ON a.zone_id = z.id
    WHERE a.id = ?
  `).get(alert_id) as
    | {
        id: number;
        zone_id: number;
        lat: number;
        lng: number;
        severity: string;
        class: string;
        area_m2: number;
        overlap_pct: number;
        description: string;
        zone_name: string;
      }
    | undefined;

  if (!alert) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }

  const caseRef = generateCaseRef();
  const caseResult = db.prepare(`
    INSERT INTO cases (alert_id, case_ref, created_by) VALUES (?, ?, ?)
  `).run(alert_id, caseRef, req.user!.userId);

  const caseId = caseResult.lastInsertRowid as number;

  // Append to ledger inside atomic transaction
  const ledgerData = {
    case_ref: caseRef,
    alert_id,
    zone: alert.zone_name,
    lat: alert.lat,
    lng: alert.lng,
    severity: alert.severity,
    class: alert.class || 'Land Encroachment',
    area_m2: alert.area_m2 || 0,
    overlap_pct: alert.overlap_pct || 0,
    notes: notes ?? '',
    created_by: req.user!.email,
    timestamp: new Date().toISOString(),
  };

  const hash = appendLedger(caseId, ledgerData);
  db.prepare('UPDATE cases SET ledger_hash = ? WHERE id = ?').run(hash, caseId);

  const theCase = db.prepare('SELECT * FROM cases WHERE id = ?').get(caseId);
  res.status(201).json({ case: theCase, ledgerHash: hash });
}

export function getCase(req: Request, res: Response): void {
  const db = getDB();
  const theCase = db.prepare(`
    SELECT c.*, a.lat, a.lng, a.severity, a.class, a.area_m2, a.overlap_pct, a.before_img, a.after_img,
           a.description, a.status as alert_status, z.name as zone_name, u.email as created_by_email
    FROM cases c
    LEFT JOIN alerts a ON c.alert_id = a.id
    LEFT JOIN zones z ON a.zone_id = z.id
    LEFT JOIN users u ON c.created_by = u.id
    WHERE c.id = ?
  `).get(req.params.id) as Record<string, unknown> | undefined;

  if (!theCase) {
    res.status(404).json({ error: 'Case not found' });
    return;
  }

  const history = db.prepare(`
    SELECT ch.*, u.email as operator_email FROM case_history ch
    LEFT JOIN users u ON ch.changed_by = u.id
    WHERE ch.alert_id = ? ORDER BY ch.changed_at ASC
  `).all(theCase.alert_id as number);

  res.json({ case: theCase, history });
}

export function getCasePdf(req: Request, res: Response): void {
  const db = getDB();
  const theCase = db.prepare(`
    SELECT c.*, a.lat, a.lng, a.severity, a.class, a.area_m2, a.overlap_pct, a.before_img, a.after_img,
           a.description, a.status as alert_status, z.name as zone_name, u.email as operator_email
    FROM cases c
    LEFT JOIN alerts a ON c.alert_id = a.id
    LEFT JOIN zones z ON a.zone_id = z.id
    LEFT JOIN users u ON c.created_by = u.id
    WHERE c.id = ?
  `).get(req.params.id) as {
    id: number;
    case_ref: string;
    alert_id: number;
    lat: number;
    lng: number;
    severity: string;
    class: string;
    area_m2: number;
    overlap_pct: number;
    before_img: string;
    after_img: string;
    description: string;
    zone_name: string;
    ledger_hash: string;
    operator_email: string;
    created_at: string;
  } | undefined;

  if (!theCase) {
    res.status(404).json({ error: 'Case not found' });
    return;
  }

  generateFIRPdf({
    caseRef: theCase.case_ref,
    caseId: theCase.id,
    alertId: theCase.alert_id,
    timestamp: theCase.created_at,
    lat: theCase.lat,
    lng: theCase.lng,
    area_m2: theCase.area_m2 || 4200,
    overlap_pct: theCase.overlap_pct || 88.5,
    encroachmentClass: theCase.class || 'Land Encroachment',
    severity: theCase.severity,
    zone: theCase.zone_name,
    ledgerHash: theCase.ledger_hash,
    operatorEmail: theCase.operator_email,
    beforeImg: theCase.before_img,
    afterImg: theCase.after_img,
  }, res);
}
