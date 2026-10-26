/**
 * Optional Supabase (PostgreSQL + PostGIS) sync.
 *
 * The browser store stays the primary copy so the app always works offline. When a Supabase URL
 * and public anon key are configured, alerts are mirrored to `alerts`, every evidence block is
 * appended to `ledger_blocks`, and chain-head anchors to `chain_anchors` (both append-only in the
 * database). Talks to Supabase's REST API (PostgREST) with fetch: no extra dependency.
 */

import type { Alert } from '../types/alert.types';
import type { LedgerBlock } from '../engine/ledger';

const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
let URL_ = String(env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
let KEY = String(env.VITE_SUPABASE_ANON_KEY || '');

/** True when a Supabase URL and anon key are configured. */
export function isDbConfigured(): boolean {
  return Boolean(URL_ && KEY && typeof fetch !== 'undefined');
}

/** Override the connection (used by tests). */
export function configureDb(url: string, key: string): void {
  URL_ = url.replace(/\/+$/, '');
  KEY = key;
  status = { state: isDbConfigured() ? 'connecting' : 'off', host: URL_ ? new URL(URL_).host : undefined };
}

export type DbState = 'off' | 'connecting' | 'online' | 'error';
export interface DbStatus {
  state: DbState;
  lastSync?: string;
  message?: string;
  host?: string;
}

let status: DbStatus = { state: isDbConfigured() ? 'connecting' : 'off', host: URL_ ? new URL(URL_).host : undefined };
const listeners = new Set<(s: DbStatus) => void>();
function setStatus(patch: Partial<DbStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l(status));
}
export function getDbStatus(): DbStatus {
  return status;
}
export function subscribeDbStatus(fn: (s: DbStatus) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function rest(path: string, init: RequestInit & { prefer?: string } = {}): Promise<Response> {
  const headers: Record<string, string> = {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
  };
  if (init.prefer) headers.Prefer = init.prefer;
  const res = await fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { ...headers, ...(init.headers as any) } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${body.slice(0, 200)}`);
  }
  return res;
}

function ok() {
  setStatus({ state: 'online', lastSync: new Date().toISOString(), message: undefined });
}
function fail(e: unknown) {
  setStatus({ state: 'error', message: e instanceof Error ? e.message : String(e) });
}

// ── alerts (debounced full upsert) ──────────────────────────────────────────
let pendingAlerts: Alert[] | null = null;
let alertTimer: ReturnType<typeof setTimeout> | null = null;

function alertRow(a: Alert) {
  return {
    id: a.id,
    zone_id: a.zone_id ?? null,
    zone_name: a.zone_name ?? null,
    class: a.class ?? null,
    severity: a.severity ?? null,
    status: a.status ?? null,
    lat: a.lat ?? null,
    lng: a.lng ?? null,
    area_m2: a.area_m2 ?? null,
    overlap_pct: a.overlap_pct ?? null,
    data_source: a.data_source ?? null,
    is_real_scene: a.is_real_scene === true,
    t0_scene_id: a.t0_scene_id ?? null,
    t1_scene_id: a.t1_scene_id ?? null,
    // keep large inline images out of the database row
    data: { ...a, before_img: a.before_img?.startsWith('data:') ? '' : a.before_img, after_img: a.after_img?.startsWith('data:') ? '' : a.after_img },
    created_at: a.created_at ?? null,
  };
}

export function queueAlertsSync(alerts: Alert[]): void {
  if (!isDbConfigured()) return;
  pendingAlerts = alerts;
  if (alertTimer) clearTimeout(alertTimer);
  alertTimer = setTimeout(async () => {
    const batch = pendingAlerts;
    pendingAlerts = null;
    if (!batch) return;
    try {
      await rest('alerts?on_conflict=id', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=minimal',
        body: JSON.stringify(batch.map(alertRow)),
      });
      ok();
    } catch (e) {
      fail(e);
    }
  }, 800);
}

// ── ledger (append-only) ────────────────────────────────────────────────────
const sentBlocks = new Set<string>();
let ledgerTimer: ReturnType<typeof setTimeout> | null = null;
let pendingChain: LedgerBlock[] | null = null;

export const chainIdOf = (chain: LedgerBlock[]) => (chain.length ? chain[0].hash : '');

function blockRow(chainId: string, b: LedgerBlock) {
  return {
    chain_id: chainId,
    idx: b.index,
    type: b.type,
    ts: b.timestamp,
    operator: b.operator,
    prev_hash: b.prevHash,
    hash: b.hash,
    signature: b.signature ?? null,
    public_key: b.publicKey ?? null,
    payload: b.payload,
    manifest: b.manifest ?? null,
  };
}

/**
 * Appends blocks the database has not seen. Existing (chain_id, idx) rows are never overwritten
 * ("ignore duplicates"), so a block altered later in the browser cannot replace the stored copy.
 */
export function queueLedgerSync(chain: LedgerBlock[]): void {
  if (!isDbConfigured() || !chain.length) return;
  pendingChain = chain;
  if (ledgerTimer) clearTimeout(ledgerTimer);
  ledgerTimer = setTimeout(async () => {
    const c = pendingChain;
    pendingChain = null;
    if (!c) return;
    const chainId = chainIdOf(c);
    const fresh = c.filter((b) => !sentBlocks.has(`${chainId}:${b.index}`));
    if (!fresh.length) return;
    try {
      await rest('ledger_blocks?on_conflict=chain_id,idx', {
        method: 'POST',
        prefer: 'resolution=ignore-duplicates,return=minimal',
        body: JSON.stringify(fresh.map((b) => blockRow(chainId, b))),
      });
      fresh.forEach((b) => sentBlocks.add(`${chainId}:${b.index}`));
      ok();
    } catch (e) {
      fail(e);
    }
  }, 600);
}

export async function saveAnchor(chainId: string, headHash: string, blockIndex: number): Promise<void> {
  if (!isDbConfigured() || !chainId) return;
  try {
    await rest('chain_anchors?on_conflict=chain_id,head_hash', {
      method: 'POST',
      prefer: 'resolution=ignore-duplicates,return=minimal',
      body: JSON.stringify([{ chain_id: chainId, head_hash: headHash, block_index: blockIndex }]),
    });
    ok();
  } catch (e) {
    fail(e);
  }
}

export interface DbComparison {
  storedBlocks: number;
  localBlocks: number;
  firstMismatch: number | null;
  missingInDb: number;
}

/** Compares the browser chain with the copy held by the database. */
export async function compareChainWithDb(chain: LedgerBlock[]): Promise<DbComparison> {
  const chainId = chainIdOf(chain);
  const res = await rest(`ledger_blocks?chain_id=eq.${encodeURIComponent(chainId)}&select=idx,hash&order=idx.asc`, {
    method: 'GET',
  });
  const rows = (await res.json()) as { idx: number; hash: string }[];
  ok();
  const byIdx = new Map(rows.map((r) => [r.idx, r.hash]));
  let firstMismatch: number | null = null;
  let missing = 0;
  for (const b of chain) {
    const h = byIdx.get(b.index);
    if (h === undefined) missing++;
    else if (h !== b.hash && firstMismatch === null) firstMismatch = b.index;
  }
  return { storedBlocks: rows.length, localBlocks: chain.length, firstMismatch, missingInDb: missing };
}

/** Pushes the 8 zone boundaries once so PostGIS can run spatial checks. */
export async function syncZones(zones: { id: number; name: string; geojson: string; risk_level?: string }[]): Promise<void> {
  if (!isDbConfigured()) return;
  try {
    await rest('zones?on_conflict=id', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: JSON.stringify(
        zones.map((z) => ({ id: z.id, code: `Z-${z.id}`, name: z.name, risk_level: z.risk_level ?? null, geojson: JSON.parse(z.geojson) }))
      ),
    });
    ok();
  } catch (e) {
    fail(e);
  }
}

export async function pingDb(): Promise<void> {
  if (!isDbConfigured()) return;
  try {
    await rest('alerts?select=id&limit=1', { method: 'GET' });
    ok();
  } catch (e) {
    fail(e);
  }
}

export interface AlertZoneCheck {
  alert_id: number;
  zone_name: string;
  inside_zone: boolean;
  distance_outside_m: number;
}

/** Reads the PostGIS view: which stored alerts lie inside their zone polygon. */
export async function fetchAlertZoneChecks(): Promise<AlertZoneCheck[]> {
  const res = await rest('alert_zone_check?select=alert_id,zone_name,inside_zone,distance_outside_m', { method: 'GET' });
  ok();
  return res.json();
}
