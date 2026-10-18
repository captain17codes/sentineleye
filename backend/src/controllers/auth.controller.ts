import { Request, Response } from 'express';
import { getDB } from '../db';
import { hashPassword, comparePassword, signToken, getTokenOptions } from '../services/auth.service';

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  // Security requirement A4: Register ALWAYS creates role=operator (ignore role in body). Admin only via seed.
  const assignedRole = 'operator';
  const db = getDB();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await hashPassword(password);
  const result = db.prepare(`
    INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)
  `).run(email, passwordHash, assignedRole);

  const user = db.prepare('SELECT id, email, role, created_at FROM users WHERE id = ?')
    .get(result.lastInsertRowid) as { id: number; email: string; role: string; created_at: string };

  const token = signToken({ userId: user.id, email: user.email, role: 'operator' });
  res.cookie('token', token, getTokenOptions());
  res.status(201).json({ user });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  const db = getDB();

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
    { id: number; email: string; password_hash: string; role: string; created_at: string } | undefined;

  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role as 'operator' | 'admin' });
  res.cookie('token', token, getTokenOptions());
  res.json({
    user: { id: user.id, email: user.email, role: user.role, created_at: user.created_at }
  });
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie('token', { path: '/' });
  res.json({ message: 'Logged out successfully' });
}

export function getMe(req: Request, res: Response): void {
  const db = getDB();
  const user = db.prepare('SELECT id, email, role, created_at FROM users WHERE id = ?')
    .get(req.user!.userId) as { id: number; email: string; role: string; created_at: string } | undefined;

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user });
}
