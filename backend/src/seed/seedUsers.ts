import { getDB } from '../db';
import bcrypt from 'bcryptjs';

export function seedUsers(): void {
  const db = getDB();
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (existing.cnt > 0) {
    console.log('ℹ️  Users already seeded, skipping.');
    return;
  }

  const operatorHash = bcrypt.hashSync('operator123', 12);
  const adminHash = bcrypt.hashSync('admin123', 12);

  db.prepare(`
    INSERT INTO users (email, password_hash, role)
    VALUES (?, ?, ?)
  `).run('operator@sentineleye.com', operatorHash, 'operator');

  db.prepare(`
    INSERT INTO users (email, password_hash, role)
    VALUES (?, ?, ?)
  `).run('admin@sentineleye.com', adminHash, 'admin');

  console.log('✅ Seeded demo users:');
  console.log('   📧 operator@sentineleye.com / operator123 (operator)');
  console.log('   📧 admin@sentineleye.com    / admin123    (admin)');
}
