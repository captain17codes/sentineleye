/**
 * alertStore.ts — Central in-memory + localStorage alert store.
 * All pages derive their data from here via selectors.
 * No direct seededData.ts reads in components or pages.
 */

import { Alert, AlertStatus } from '../../types/alert.types';
import { STORAGE_KEYS, DEMO_SEED, TARGET_DISTRIBUTION } from '../config';
import { SEEDED_ZONES } from '../../api/seededData';
import { runScanPipeline } from '../scan/pipeline';

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

// ── Seeded alert generation via Real Scan Pipeline ─────────────────────────

/**
 * Generate exactly 38 alerts matching TARGET_DISTRIBUTION (6 Crit, 14 High, 11 Med, 7 Low)
 * by running the scan pipeline on scenario scenes for each zone.
 * Scatter NDVI/SAR values, areas, and overlap percentages are deterministic engine outputs.
 */
function generateSeedAlerts(): Alert[] {
  const now = Date.now();
  const alerts: Alert[] = [];

  let alertIdCounter = 601;
  let scanIdCounter = 101;

  for (const zone of SEEDED_ZONES) {
    const poly = JSON.parse(zone.geojson);
    const coords = poly.geometry.coordinates[0];
    const lngs = coords.map((c: number[]) => c[0]);
    const lats = coords.map((c: number[]) => c[1]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    const bbox = { minLng, maxLng, minLat, maxLat };

    // Execute the real scan pipeline synchronously
    const scanResult = runScanPipeline({
      zoneId: zone.id,
      bbox,
      zoneGeoJson: poly,
      mode: 'fused',
      cloudCoverage: 0,
      seed: DEMO_SEED,
    });

    for (const d of scanResult.detections) {
      const idx = alerts.length;
      // Deterministically space timestamps over last 30 days
      const daysAgo = (idx * 0.77 + 0.5) % 29.5;
      const created_at = new Date(now - daysAgo * 86400000).toISOString();
      const t1_timestamp = created_at;
      const t0_timestamp = new Date(new Date(created_at).getTime() - (730 + (idx % 25)) * 86400000).toISOString();

      // Status distribution weighted to realistic state maturity
      const status: AlertStatus =
        d.severity === 'CRITICAL'
          ? idx % 2 === 0 ? 'Verified' : 'Notice Issued'
          : d.severity === 'HIGH'
          ? idx % 3 === 0 ? 'New' : idx % 3 === 1 ? 'Verified' : 'Notice Issued'
          : idx % 2 === 0 ? 'New' : 'Verified';

      const alertItem: Alert = {
        id: alertIdCounter++,
        scan_id: scanIdCounter++,
        zone_id: zone.id,
        zone_name: zone.name,
        class: d.class,
        severity: d.severity,
        status,
        lat: Number(d.centroid[1].toFixed(6)),
        lng: Number(d.centroid[0].toFixed(6)),
        area_m2: d.areaM2,
        overlap_pct: d.overlapPct,
        before_img: '',
        after_img: '',
        description: `${d.class} detected in ${zone.name}. ${d.overlapPct}% overlap with cadastral boundary.`,
        created_at,
        confidence: d.confidence,
        ndvi_delta: d.meanNdviDiff,
        sar_delta: d.meanSarDiff,
        t0_timestamp,
        t1_timestamp,
        audit_trail: [
          {
            timestamp: created_at,
            status: 'New',
            operator: 'sentineleye-automated-pipeline',
            note: `Automated detection vector generated via Sentinel-1/2 fusion. Overlap ${d.overlapPct}%.`,
            block_hash: `0x${((idx + 1) * 987654321).toString(16).padStart(64, 'a')}`,
            block_index: idx + 1,
          },
        ],
      };

      alerts.push(alertItem);
    }
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

export function updateAlert(id: number, patch: Partial<Alert>): Alert | null {
  const store = getStore();
  let updated: Alert | null = null;
  store.alerts = store.alerts.map((a) => {
    if (a.id === id) {
      updated = { ...a, ...patch };
      return updated;
    }
    return a;
  });
  saveToStorage(store);
  notifySubscribers();
  return updated;
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
