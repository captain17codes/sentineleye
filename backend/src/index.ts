import 'dotenv/config';
import { app } from './app';
import { initDB } from './db';
import { runSeed } from './seed/seed';

// Security: Refuse to start if JWT_SECRET is not configured
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
  console.error('\n❌ FATAL SECURITY ERROR: JWT_SECRET environment variable is missing or empty.');
  console.error('SentinelEye backend refuses to start without a valid JWT_SECRET.\n');
  process.exit(1);
}

const PORT = process.env.PORT || 3001;

async function main() {
  initDB();
  runSeed();
  app.listen(PORT, () => {
    console.log(`\n🛰  SentinelEye API running on http://localhost:${PORT}`);
    console.log(`📡  Environment: ${process.env.NODE_ENV}`);
    console.log(`🗄  Database: ${process.env.DB_PATH}\n`);
  });
}

main().catch(console.error);
