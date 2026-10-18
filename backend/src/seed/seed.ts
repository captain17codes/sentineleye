import { initDB } from '../db';
import { seedUsers } from './seedUsers';
import { seedZones } from './seedZones';
import { seedAlerts } from './seedAlerts';

export function runSeed(): void {
  console.log('🌱 Running seed...');
  initDB();
  seedUsers();
  seedZones();
  seedAlerts();
  console.log('🌱 Seed complete.\n');
}

if (require.main === module) {
  runSeed();
}

