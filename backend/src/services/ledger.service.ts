import crypto from 'crypto';
import { getDB } from '../db';

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function appendLedger(caseId: number, dataObj: Record<string, unknown>): string {
  const db = getDB();
  const dataJson = JSON.stringify(dataObj);

  // Requirement A5: append inside a transaction
  const insertTx = db.transaction(() => {
    const last = db.prepare(
      'SELECT hash FROM ledger ORDER BY id DESC LIMIT 1'
    ).get() as { hash: string } | undefined;

    const prevHash = last?.hash ?? 'GENESIS';
    const hash = sha256(prevHash + dataJson);

    db.prepare(`
      INSERT INTO ledger (case_id, data_json, prev_hash, hash)
      VALUES (?, ?, ?, ?)
    `).run(caseId, dataJson, prevHash, hash);

    return hash;
  });

  return insertTx();
}

export function verifyChain(): { valid: boolean; brokenAt: number | null; chainLength: number } {
  const db = getDB();
  const rows = db.prepare('SELECT * FROM ledger ORDER BY id ASC').all() as Array<{
    id: number;
    case_id: number;
    data_json: string;
    prev_hash: string;
    hash: string;
  }>;

  let expectedPrevHash = 'GENESIS';

  for (const row of rows) {
    // Check previous block link
    if (row.prev_hash !== expectedPrevHash) {
      return { valid: false, brokenAt: row.id, chainLength: rows.length };
    }

    // Requirement A5: verify recomputes each hash from data_json
    const computedHash = sha256(expectedPrevHash + row.data_json);
    if (computedHash !== row.hash) {
      return { valid: false, brokenAt: row.id, chainLength: rows.length };
    }

    expectedPrevHash = row.hash;
  }

  return { valid: true, brokenAt: null, chainLength: rows.length };
}
