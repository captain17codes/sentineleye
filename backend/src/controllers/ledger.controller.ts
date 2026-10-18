import { Request, Response } from 'express';
import { getDB } from '../db';
import { verifyChain } from '../services/ledger.service';

export function getLedger(_req: Request, res: Response): void {
  const db = getDB();
  const entries = db.prepare(`
    SELECT l.*, c.case_ref FROM ledger l
    LEFT JOIN cases c ON l.case_id = c.id
    ORDER BY l.id ASC
  `).all();
  res.json({ ledger: entries });
}

export function verifyLedger(_req: Request, res: Response): void {
  const result = verifyChain();
  res.json(result);
}
