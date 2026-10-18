import { getDB } from '../db';

export function appendNotification(type: string, message: string): void {
  const db = getDB();
  db.prepare(`
    INSERT INTO notifications (type, message, is_simulated)
    VALUES (?, ?, 1)
  `).run(type, message);
}
