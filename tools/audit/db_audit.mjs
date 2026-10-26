// Read-only audit of the Supabase database used by SentinelEye (plus one append-only probe).
// Usage: node db_audit.mjs [label]
import { createHash } from 'node:crypto';

const U = process.env.SUPABASE_URL;
const K = process.env.SUPABASE_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };
const out = [];
const log = (...a) => { const l = a.join(' '); out.push(l); console.log(l); };

async function get(path, extra = {}) {
  const r = await fetch(`${U}/rest/v1/${path}`, { headers: { ...H, ...extra } });
  const t = await r.text();
  return { status: r.status, headers: r.headers, body: t ? JSON.parse(t) : null };
}
async function count(table) {
  const r = await fetch(`${U}/rest/v1/${table}?select=*&limit=1`, { headers: { ...H, Prefer: 'count=exact' } });
  return Number((r.headers.get('content-range') || '/0').split('/')[1]);
}
async function all(table, select, order) {
  const rows = [];
  for (let off = 0; ; off += 1000) {
    const r = await get(`${table}?select=${select}&order=${order}&limit=1000&offset=${off}`);
    if (r.status !== 200) throw new Error(`${table} ${r.status} ${JSON.stringify(r.body)}`);
    rows.push(...r.body);
    if (r.body.length < 1000) return rows;
  }
}
function canonical(o) {
  if (o === null || typeof o !== 'object') return JSON.stringify(o);
  if (Array.isArray(o)) return '[' + o.map(canonical).join(',') + ']';
  return '{' + Object.keys(o).sort().map((k) => `"${k}":${canonical(o[k])}`).join(',') + '}';
}
const sha = (s) => createHash('sha256').update(s).digest('hex');

export async function audit(label = '') {
  log(`\n===== DB AUDIT ${label} @ ${new Date().toISOString()} =====`);
  for (const t of ['alerts', 'ledger_blocks', 'chain_anchors', 'zones']) log(`rows ${t}: ${await count(t)}`);

  // zones
  const zones = await all('zones', 'id,code,name,area_m2', 'id.asc');
  for (const z of zones) log(`  zone ${z.code} ${z.name}: ${z.area_m2 ? (z.area_m2 / 1e4).toFixed(1) + ' ha' : 'NO GEOMETRY'}`);

  // alerts
  const alerts = await all('alerts', 'id,zone_id,status,severity,lat,lng,data_source,is_real_scene,updated_at', 'id.asc');
  const byStatus = {};
  alerts.forEach((a) => (byStatus[a.status] = (byStatus[a.status] || 0) + 1));
  log(`alerts by status: ${JSON.stringify(byStatus)}`);
  log(`alerts missing lat/lng: ${alerts.filter((a) => a.lat == null || a.lng == null).length}`);
  log(`alerts from real scenes: ${alerts.filter((a) => a.is_real_scene).length}`);
  const newest = alerts.map((a) => a.updated_at).sort().pop();
  log(`latest alert update: ${newest}`);
  const chk = await all('alert_zone_check', 'alert_id,inside_zone,distance_outside_m', 'alert_id.asc');
  log(`PostGIS alert_zone_check: ${chk.length} rows, inside=${chk.filter((c) => c.inside_zone).length}, outside=${chk.filter((c) => !c.inside_zone).length}`);
  const outside = chk.filter((c) => !c.inside_zone).slice(0, 5);
  if (outside.length) log(`  e.g. outside: ${outside.map((c) => `#${c.alert_id} ${c.distance_outside_m} m`).join(', ')}`);

  // ledger
  const blocks = await all('ledger_blocks', 'chain_id,idx,type,ts,operator,prev_hash,hash,payload,signature', 'chain_id.asc,idx.asc');
  const chains = new Map();
  blocks.forEach((b) => (chains.has(b.chain_id) ? chains.get(b.chain_id) : chains.set(b.chain_id, []).get(b.chain_id)).push(b));
  log(`ledger chains: ${chains.size}`);
  const summary = {};
  for (const [id, bs] of chains) {
    bs.sort((a, b) => a.idx - b.idx);
    let gaps = 0, links = 0, hashOk = 0, hashOkIso = 0, unsigned = 0;
    bs.forEach((b, i) => {
      if (b.idx !== i) gaps++;
      if (i > 0 && b.prev_hash !== bs[i - 1].hash) links++;
      if (!b.signature) unsigned++;
      const p = canonical(b.payload);
      const iso = b.ts ? new Date(b.ts).toISOString() : '';
      if (sha(`${b.idx}:${b.prev_hash}:${b.ts}:${p}:${b.operator}`) === b.hash) hashOk++;
      if (sha(`${b.idx}:${b.prev_hash}:${iso}:${p}:${b.operator}`) === b.hash) hashOkIso++;
    });
    summary[id] = { blocks: bs.length, gaps, brokenLinks: links, hashRecomputed: hashOkIso, hashRawTs: hashOk, unsigned };
    log(`  chain ${id.slice(0, 40)}: ${bs.length} blocks, idx gaps ${gaps}, broken prev-links ${links}, hash re-computed OK ${hashOkIso}/${bs.length} (raw ts ${hashOk}), unsigned ${unsigned}, types ${[...new Set(bs.map((b) => b.type))].join('/')}`);
  }

  // anchors
  const anchors = await all('chain_anchors', 'chain_id,head_hash,block_index', 'id.asc');
  const known = new Set(blocks.map((b) => `${b.chain_id}:${b.hash}`));
  log(`anchors: ${anchors.length}, pointing at a stored block: ${anchors.filter((a) => known.has(`${a.chain_id}:${a.head_hash}`)).length}`);

  return { alerts, chains: summary, blocks };
}

export async function appendOnlyProbe() {
  const b = (await get('ledger_blocks?select=chain_id,idx,hash&limit=1&order=received_at.desc')).body?.[0];
  if (!b) return log('append-only probe: no blocks to test');
  const q = `ledger_blocks?chain_id=eq.${encodeURIComponent(b.chain_id)}&idx=eq.${b.idx}`;
  const p = await fetch(`${U}/rest/v1/${q}`, { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ hash: 'forged' }) });
  const pt = await p.text();
  const d = await fetch(`${U}/rest/v1/${q}`, { method: 'DELETE', headers: { ...H, Prefer: 'return=representation' } });
  const dt = await d.text();
  const after = (await get(`${q}&select=hash`)).body?.[0]?.hash;
  log(`append-only probe on ${b.chain_id.slice(0, 24)}#${b.idx}: PATCH -> ${p.status} ${pt.slice(0, 90)} | DELETE -> ${d.status} ${dt.slice(0, 90)} | hash unchanged: ${after === b.hash}`);
}

export function dump(file) {
  return import('node:fs').then((fs) => fs.appendFileSync(file, out.join('\n') + '\n'));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await audit(process.argv[2] || '');
  await appendOnlyProbe();
  await dump(process.env.OUT || 'audit_result.txt');
}
