import { Request, Response } from 'express';
import { getDB } from '../db';

export function getNotifications(_req: Request, res: Response): void {
  const db = getDB();
  const notifications = db.prepare(`
    SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50
  `).all();
  res.json({ notifications });
}
