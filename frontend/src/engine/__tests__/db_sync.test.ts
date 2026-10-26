import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// In-memory stand-in for Supabase's REST API with the same append-only rule as database/schema.sql
function fakeSupabase() {
  const alerts = new Map<number, any>();
  const blocks = new Map<string, any>();
  const calls: { url: string; method: string; prefer?: string }[] = [];
  const fetchMock = vi.fn(async (url: string, init: any = {}) => {
    const u = new URL(url);
    const method = init.method || 'GET';
    calls.push({ url, method, prefer: init.headers?.Prefer });
    if (init.headers?.apikey !== 'anon-key') return new Response('no key', { status: 401 });
    const table = u.pathname.replace('/rest/v1/', '');
    if (method === 'POST') {
      const rows = JSON.parse(init.body);
      for (const r of rows) {
        if (table === 'alerts') alerts.set(r.id, r);
        if (table === 'ledger_blocks') {
          const k = `${r.chain_id}:${r.idx}`;
          if (!blocks.has(k)) blocks.set(k, r); // ignore-duplicates: never overwrite evidence
        }
      }
      return new Response(null, { status: 201 });
    }
    if (table === 'ledger_blocks') {
      const chain = u.searchParams.get('chain_id')!.replace('eq.', '');
      const rows = [...blocks.values()].filter((b) => b.chain_id === chain).map((b) => ({ idx: b.idx, hash: b.hash }));
      return new Response(JSON.stringify(rows), { status: 200 });
    }
    return new Response('[]', { status: 200 });
  });
  return { alerts, blocks, calls, fetchMock };
}

const block = (index: number, hash: string) =>
  ({ index, type: 'DETECTION', timestamp: '2026-01-01T00:00:00Z', payload: { a: index }, operator: 'op', prevHash: 'p', hash }) as any;

describe('Supabase sync', () => {
  let db: ReturnType<typeof fakeSupabase>;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    db = fakeSupabase();
    vi.stubGlobal('fetch', db.fetchMock);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('upserts alerts without inline images', async () => {
    const m = await import('../../lib/db');
    m.configureDb('https://demo.supabase.co', 'anon-key');
    expect(m.isDbConfigured()).toBe(true);
    m.queueAlertsSync([{ id: 7, zone_id: 102, status: 'New', lat: 28.37, lng: 77.17, before_img: 'data:image/bmp;base64,AAAA' } as any]);
    await vi.advanceTimersByTimeAsync(1000);
    const call = db.calls.find((c) => c.url.includes('/alerts'));
    expect(call?.prefer).toContain('merge-duplicates');
    expect(db.alerts.get(7).data.before_img).toBe('');
    expect(m.getDbStatus().state).toBe('online');
  });

  it('appends ledger blocks and detects a block changed in the browser afterwards', async () => {
    const m = await import('../../lib/db');
    m.configureDb('https://demo.supabase.co', 'anon-key');
    const chain = [block(0, 'genesis'), block(1, 'h1'), block(2, 'h2')];
    m.queueLedgerSync(chain);
    await vi.advanceTimersByTimeAsync(1000);
    expect(db.blocks.size).toBe(3);
    expect(db.calls.find((c) => c.url.includes('ledger_blocks') && c.method === 'POST')?.prefer).toContain('ignore-duplicates');

    expect((await m.compareChainWithDb(chain)).firstMismatch).toBeNull();

    // attacker rewrites block 1 locally and re-syncs: the database copy must not change
    const tampered = [chain[0], block(1, 'FORGED'), block(2, 'FORGED2')];
    m.queueLedgerSync(tampered);
    await vi.advanceTimersByTimeAsync(1000);
    expect(db.blocks.get(`${m.chainIdOf(chain)}:1`).hash).toBe('h1');
    const cmp = await m.compareChainWithDb(tampered);
    expect(cmp.firstMismatch).toBe(1);
    expect(cmp.storedBlocks).toBe(3);
  });

  it('keeps chains from two browsers apart even though their genesis block is identical', async () => {
    const m = await import('../../lib/db');
    m.configureDb('https://demo.supabase.co', 'anon-key');
    const g = (key: string) => ({ ...block(0, 'same-genesis'), publicKey: key });
    const a = [g('KEY-A'), block(1, 'a1')];
    const b = [g('KEY-B'), block(1, 'b1')];
    expect(m.chainIdOf(a)).not.toBe(m.chainIdOf(b));
    m.queueLedgerSync(a);
    await vi.advanceTimersByTimeAsync(1000);
    m.queueLedgerSync(b);
    await vi.advanceTimersByTimeAsync(1000);
    expect(db.blocks.size).toBe(4);
    expect((await m.compareChainWithDb(a)).firstMismatch).toBeNull();
    expect((await m.compareChainWithDb(b)).firstMismatch).toBeNull();
  });

  it('flushes pending changes immediately when the tab is hidden', async () => {
    const m = await import('../../lib/db');
    m.configureDb('https://demo.supabase.co', 'anon-key');
    m.queueAlertsSync([{ id: 9, status: 'Verified' } as any]);
    m.flushDbSync();
    await vi.advanceTimersByTimeAsync(0);
    expect(db.alerts.get(9)?.status).toBe('Verified');
  });

  it('is a no-op when no database is configured', async () => {
    const m = await import('../../lib/db');
    expect(m.isDbConfigured()).toBe(false);
    m.queueAlertsSync([{ id: 1 } as any]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(db.fetchMock).not.toHaveBeenCalled();
    expect(m.getDbStatus().state).toBe('off');
  });
});
