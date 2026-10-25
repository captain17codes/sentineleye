/**
 * alertStore.ts — Central in-memory + localStorage alert store.
 * All pages derive their data from here via selectors.
 * No direct seededData.ts reads in components or pages.
 */

import { Alert, AlertStatus } from '../../types/alert.types';
import { STORAGE_KEYS, DEMO_SEED, TARGET_DISTRIBUTION } from '../config';
import { mulberry32, randRange, randInt, pick } from '../prng';
import { SEEDED_ZONES } from '../../api/seededData';

// ── Types ──────────────────────────────────────────────────────────────────

export interface LedgerBlock {
  index: number;
  type: 'SCENE_INGEST' | 'DETECTION' | 'VERIFIED' | 'NOTICE_ISSUED';
  timestamp: string;
  payload: Record<string, unknown>;
  operator: string;
  prevHash: string;
  hash: string;
}

export interface AlertStore {
  alerts: Alert[];
  ledger: LedgerBlock[];
}

// ── Singleton store ────────────────────────────────────────────────────────

let _store: AlertStore | null = null;

function loadFromStorage(): AlertStore | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ALERTS);
    if (raw) {
      const parsed = JSON.parse(raw) as AlertStore;
      // Validate it looks like the right shape
      if (Array.isArray(parsed.alerts) && parsed.alerts.length > 0) {
        return parsed;
      }
    }
  } catch {
    // corrupted — regenerate
  }
  return null;
}

function saveToStorage(store: AlertStore): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(store));
  } catch {
    // storage full — ignore
  }
}

// ── Seeded alert generation ────────────────────────────────────────────────

const CLASSES = ['Deforestation', 'Unauthorized Construction', 'Mining', 'Land Encroachment'] as const;
type AlertClass = typeof CLASSES[number];

const STATUS_OPTIONS: AlertStatus[] = ['New', 'Verified', 'Notice Issued'];

function classToSeverityBias(cls: AlertClass, rand: ReturnType<typeof mulberry32>): string {
  const r = rand();
  if (cls === 'Unauthorized Construction') {
    return r < 0.3 ? 'CRITICAL' : r < 0.6 ? 'HIGH' : r < 0.85 ? 'MEDIUM' : 'LOW';
  }
  if (cls === 'Mining') {
    return r < 0.25 ? 'CRITICAL' : r < 0.55 ? 'HIGH' : r < 0.80 ? 'MEDIUM' : 'LOW';
  }
  if (cls === 'Deforestation') {
    return r < 0.10 ? 'CRITICAL' : r < 0.40 ? 'HIGH' : r < 0.70 ? 'MEDIUM' : 'LOW';
  }
  // Land Encroachment
  return r < 0.15 ? 'CRITICAL' : r < 0.45 ? 'HIGH' : r < 0.75 ? 'MEDIUM' : 'LOW';
}

/**
 * Generate exactly 38 alerts matching TARGET_DISTRIBUTION using DEMO_SEED.
 * Same seed → same alerts every cold boot.
 */
function generateSeedAlerts(): Alert[] {
  const rand = mulberry32(DEMO_SEED);

  // Build a severity pool matching exact distribution
  const severityPool: string[] = [
    ...Array(TARGET_DISTRIBUTION.CRITICAL).fill('CRITICAL'),
    ...Array(TARGET_DISTRIBUTION.HIGH).fill('HIGH'),
    ...Array(TARGET_DISTRIBUTION.MEDIUM).fill('MEDIUM'),
    ...Array(TARGET_DISTRIBUTION.LOW).fill('LOW'),
  ];

  // Shuffle the pool deterministically
  for (let i = severityPool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [severityPool[i], severityPool[j]] = [severityPool[j], severityPool[i]];
  }

  const now = Date.now();
  const alerts: Alert[] = [];

  const zones = SEEDED_ZONES;

  for (let i = 0; i < 38; i++) {
    const severity = severityPool[i];
    const zone = zones[i % zones.length];
    const cls = pick(rand, CLASSES);

    // Distribute timestamps over last 30 days deterministically
    const daysAgo = randRange(rand, 0, 30);
    const created_at = new Date(now - daysAgo * 86400000).toISOString();

    // Area proportional to severity
    const baseArea = severity === 'CRITICAL' ? 12000 : severity === 'HIGH' ? 8000 : severity === 'MEDIUM' ? 4500 : 2000;
    const area_m2 = Math.round(randRange(rand, baseArea * 0.6, baseArea * 1.5));
    const overlap_pct = randRange(rand,
      severity === 'CRITICAL' ? 0.85 : severity === 'HIGH' ? 0.55 : 0.35,
      0.98
    );

    // Status weighted toward more mature states
    const statusR = rand();
    const status: AlertStatus = statusR < 0.3 ? 'New' : statusR < 0.65 ? 'Verified' : 'Notice Issued';

    // Pseudo-spectral features for scatter plot
    const ndvi_delta = -(randRange(rand, 0.1, 0.55));
    const sar_delta = severity === 'CRITICAL' || severity === 'HIGH'
      ? randRange(rand, 3.5, 7.0)
      : randRange(rand, 1.0, 4.0);

    const confidence = randRange(rand, 0.72, 0.98);

    // Geo coords within zone bounds (rough)
    const geo = JSON.parse(zone.geojson);
    const coords = geo?.geometry?.coordinates?.[0] || [[77.08, 28.5], [77.14, 28.5], [77.14, 28.58], [77.08, 28.58]];
    const lngs = coords.map((c: number[]) => c[0]);
    const lats = coords.map((c: number[]) => c[1]);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const lat = randRange(rand, minLat, maxLat);
    const lng = randRange(rand, minLng, maxLng);

    alerts.push({
      id: 600 + i,
      scan_id: 100 + i,
      zone_id: zone.id,
      zone_name: zone.name,
      class: cls,
      severity: severity as any,
      status,
      lat,
      lng,
      area_m2,
      overlap_pct: Math.round(overlap_pct * 100),
      before_img: '',
      after_img: '',
      description: `${cls} detected in ${zone.name}. ${Math.round(overlap_pct * 100)}% overlap with cadastral boundary.`,
      created_at,
      confidence,
      ndvi_delta,
      sar_delta,
    } as Alert & { ndvi_delta: number; sar_delta: number });
  }

  return alerts;
}

// ── Public API ─────────────────────────────────────────────────────────────

export function getStore(): AlertStore {
  if (_store) return _store;

  // Try loading from storage first
  const loaded = loadFromStorage();
  if (loaded) {
    _store = loaded;
    return _store;
  }

  // Generate fresh from seed
  _store = {
    alerts: generateSeedAlerts(),
    ledger: [],
  };
  saveToStorage(_store);
  return _store;
}

export function getAlerts(): Alert[] {
  return getStore().alerts;
}

export function getLedger(): LedgerBlock[] {
  return getStore().ledger;
}

export function updateAlertStatus(id: number, status: AlertStatus, _notes?: string): void {
  const store = getStore();
  store.alerts = store.alerts.map((a) => (a.id === id ? { ...a, status } : a));
  saveToStorage(store);
  notifySubscribers();
}

export function addAlert(alert: Alert): void {
  const store = getStore();
  store.alerts = [alert, ...store.alerts];
  saveToStorage(store);
  notifySubscribers();
}

export function appendLedgerBlock(block: LedgerBlock): void {
  const store = getStore();
  store.ledger = [...store.ledger, block];
  saveToStorage(store);
}

export function mutateLedgerBlock(index: number, patch: Partial<LedgerBlock>): void {
  const store = getStore();
  store.ledger = store.ledger.map((b, i) => i === index ? { ...b, ...patch } : b);
  saveToStorage(store);
}

export function resetDemo(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ALERTS);
    localStorage.removeItem(STORAGE_KEYS.LEDGER);
  } catch {/* */}
  _store = null;
  getStore(); // regenerate
  notifySubscribers();
}

// ── Simple pub/sub for cross-component reactivity ──────────────────────────

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeToStore(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notifySubscribers(): void {
  listeners.forEach((fn) => fn());
}
