import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database;

export function getDB(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return db;
}

export function initDB(): void {
  const dbPath = path.resolve(process.env.DB_PATH || './sentineleye.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  console.log('✅ Database initialized:', dbPath);
}

function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'operator' CHECK(role IN ('operator','admin')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      geojson TEXT NOT NULL,
      risk_level TEXT NOT NULL DEFAULT 'medium' CHECK(risk_level IN ('low','medium','high','critical')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_id INTEGER REFERENCES zones(id),
      scene_type TEXT NOT NULL CHECK(scene_type IN ('optical','sar','fused')),
      cloud_coverage REAL NOT NULL DEFAULT 0,
      raw_classes TEXT NOT NULL DEFAULT '[]',
      validated_classes TEXT NOT NULL DEFAULT '[]',
      change_score REAL NOT NULL DEFAULT 0,
      operator_id INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_id INTEGER REFERENCES scans(id),
      zone_id INTEGER REFERENCES zones(id),
      class TEXT NOT NULL DEFAULT 'Land Encroachment',
      severity TEXT NOT NULL DEFAULT 'LOW' CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
      status TEXT NOT NULL DEFAULT 'New' CHECK(status IN ('New','Verified','Notice Issued')),
      lat REAL NOT NULL DEFAULT 0,
      lng REAL NOT NULL DEFAULT 0,
      area_m2 REAL NOT NULL DEFAULT 0,
      overlap_pct REAL NOT NULL DEFAULT 0,
      before_img TEXT NOT NULL DEFAULT '',
      after_img TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS case_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_id INTEGER NOT NULL REFERENCES alerts(id),
      status TEXT NOT NULL,
      changed_by INTEGER REFERENCES users(id),
      changed_at TEXT NOT NULL DEFAULT (datetime('now')),
      notes TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_id INTEGER NOT NULL REFERENCES alerts(id),
      case_ref TEXT UNIQUE NOT NULL,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      ledger_hash TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id INTEGER NOT NULL REFERENCES cases(id),
      data_json TEXT NOT NULL,
      prev_hash TEXT NOT NULL,
      hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL DEFAULT 'info',
      message TEXT NOT NULL,
      authority TEXT DEFAULT '',
      case_id INTEGER REFERENCES cases(id),
      channel TEXT DEFAULT 'email',
      is_simulated INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Ensure column additions for existing databases
  safeAddColumn(database, 'alerts', 'class', "TEXT NOT NULL DEFAULT 'Land Encroachment'");
  safeAddColumn(database, 'alerts', 'area_m2', 'REAL NOT NULL DEFAULT 0');
  safeAddColumn(database, 'alerts', 'overlap_pct', 'REAL NOT NULL DEFAULT 0');
  safeAddColumn(database, 'alerts', 'before_img', "TEXT NOT NULL DEFAULT ''");
  safeAddColumn(database, 'alerts', 'after_img', "TEXT NOT NULL DEFAULT ''");

  safeAddColumn(database, 'notifications', 'authority', "TEXT DEFAULT ''");
  safeAddColumn(database, 'notifications', 'case_id', 'INTEGER REFERENCES cases(id)');
  safeAddColumn(database, 'notifications', 'channel', "TEXT DEFAULT 'email'");

  try {
    database.exec(`
      UPDATE alerts SET status = 'Verified' WHERE status NOT IN ('New', 'Verified', 'Notice Issued');
      UPDATE case_history SET status = 'Verified' WHERE status NOT IN ('New', 'Verified', 'Notice Issued');
    `);
  } catch (_) {}

  console.log('✅ Migrations run successfully');
}

function safeAddColumn(database: Database.Database, table: string, column: string, typeDef: string): void {
  try {
    const tableInfo = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    const exists = tableInfo.some((col) => col.name === column);
    if (!exists) {
      database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeDef}`);
    }
  } catch (e) {
    // Column may already exist
  }
}
