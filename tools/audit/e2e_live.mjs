// Drives the LIVE site like a user and checks every write reached Supabase.
import { chromium } from 'playwright-core';
import { audit, appendOnlyProbe, dump } from './db_audit.mjs';
import fs from 'node:fs';

const SITE = process.env.SITE || 'https://sentineleye-ebon.vercel.app';
const U = process.env.SUPABASE_URL;
const K = process.env.SUPABASE_KEY;
const OUT = process.env.OUT || 'audit_result.txt';
const lines = [];
const log = (...a) => { const l = a.join(' '); console.log(l); fs.appendFileSync(OUT, l + '\n'); };
fs.mkdirSync('shots', { recursive: true });

function fnv1a(str, seed = 0x811c9dc5) {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

process.on('unhandledRejection', (e) => { fs.appendFileSync(OUT, 'UNHANDLED: ' + String(e && e.stack || e).slice(0, 900) + '\n'); process.exit(1); });
const before = await audit('BEFORE').catch((e) => { log('AUDIT BEFORE FAILED: ' + String(e && e.stack || e).slice(0, 600)); return null; });

let local = { chain: [], alerts: [] };
let browser;
const reqs = [];
const errors = [];
let alertId = null;
try {
browser = await chromium.launch({ channel: 'chrome' });
var ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
var page = await ctx.newPage();
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
page.on('pageerror', (e) => errors.push('pageerror ' + e.message.slice(0, 200)));
page.on('response', (r) => {
  const u = r.url();
  if (u.includes('supabase.co')) reqs.push(`${r.request().method()} ${new URL(u).pathname.replace('/rest/v1/', '')} -> ${r.status()}`);
});
page.on('requestfailed', (r) => r.url().includes('supabase.co') && reqs.push(`FAILED ${r.method()} ${new URL(r.url()).pathname.replace("/rest/v1/", "")} ${r.failure()?.errorText}`));

const bundle = await (await fetch(SITE)).text();
log(`live bundle: ${(bundle.match(/assets\/index-[^"]+\.js/) || ['?'])[0]}`);

await page.goto(SITE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
await page.getByRole('button', { name: /Sign in as field operator/ }).first().click();
await page.waitForTimeout(800);
const signIn = page.getByRole('button', { name: 'Sign in', exact: true });
if (await signIn.count()) await signIn.last().click();
await page.waitForURL(/overview/, { timeout: 20000 });
await page.waitForTimeout(6000);
const chip = await page.locator('text=/DB:/').first().textContent().catch(() => '?');
log(`after login: url=${page.url()} chip="${chip}"`);
await page.screenshot({ path: 'shots/1_overview.png' });

// run a scan
await page.goto(`${SITE}/scan`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.getByRole('button', { name: /^Run scan$/ }).first().click();
await page.waitForFunction(() => !document.body.innerText.includes('Running scan'), null, { timeout: 90000 }).catch(() => log('scan did not finish in 90 s'));
await page.waitForTimeout(3000);
await page.screenshot({ path: 'shots/2_scan.png', fullPage: false });
log(`scan page after run: ${(await page.locator('text=/Alerts created|validated|No new/i').first().textContent().catch(() => '?'))?.slice(0, 80)}`);

// advance the first alert one step
await page.goto(`${SITE}/alerts`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const firstRow = page.locator('tbody tr').first();
alertId = Number(((await firstRow.locator('td').first().textContent()) || '').replace('#', '').trim());
const btn = firstRow.getByRole('button', { name: /^Mark / });
const label = (await btn.count()) ? await btn.textContent() : null;
if (label) await btn.click();
await page.waitForTimeout(3000);
const statusNow = await firstRow.locator('td').nth(7).textContent();
log(`alert #${alertId}: clicked "${label}", row now shows "${statusNow?.trim()}"`);
await page.screenshot({ path: 'shots/3_alerts.png' });

// ledger compare
await page.goto(`${SITE}/ledger`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
const cmp = page.getByRole('button', { name: /Compare with database/ });
if (await cmp.count()) {
  await cmp.first().click();
  await page.waitForTimeout(4000);
}
const cmpText = await page.locator('text=/match|mismatch|stored|missing/i').first().textContent().catch(() => '(no result text)');
log(`ledger compare in UI: ${cmpText?.trim().slice(0, 200)}`);
await page.screenshot({ path: 'shots/4_ledger.png', fullPage: true });

// read the browser's own copy
local = await page.evaluate(() => ({
  chain: JSON.parse(localStorage.getItem('sentineleye_ledger_v4') || '[]'),
  alerts: JSON.parse(localStorage.getItem('sentineleye_alerts_v4') || '{"alerts":[]}').alerts,
}));
await page.waitForTimeout(2000);
} catch (e) {
  log('E2E STEP FAILED: ' + String(e && e.stack || e).slice(0, 900));
  await page?.screenshot({ path: 'shots/error.png' }).catch(() => {});
  local = await page?.evaluate(() => ({ chain: JSON.parse(localStorage.getItem('sentineleye_ledger_v4') || '[]'), alerts: JSON.parse(localStorage.getItem('sentineleye_alerts_v4') || '{"alerts":[]}').alerts })).catch(() => local);
}
await browser?.close();

const g = local.chain[0];
const chainId = g ? `${g.hash.slice(0, 16)}-${fnv1a(g.publicKey || '')}${fnv1a(g.publicKey || '', 0x01000193)}` : '';
log(`browser chain: ${local.chain.length} blocks, chain_id ${chainId}`);
const H = { apikey: K, Authorization: `Bearer ${K}` };
const dbRows = await (await fetch(`${U}/rest/v1/ledger_blocks?chain_id=eq.${encodeURIComponent(chainId)}&select=idx,hash&order=idx.asc`, { headers: H })).json();
const dbMap = new Map(dbRows.map((r) => [r.idx, r.hash]));
const missing = local.chain.filter((b) => !dbMap.has(b.index)).map((b) => b.index);
const diff = local.chain.filter((b) => dbMap.has(b.index) && dbMap.get(b.index) !== b.hash).map((b) => b.index);
log(`DB copy of this chain: ${dbRows.length} blocks; missing in DB: [${missing.join(',')}]; hash differs: [${diff.join(',')}]`);

const localAlert = local.alerts.find((a) => a.id === alertId);
const dbAlert = (await (await fetch(`${U}/rest/v1/alerts?id=eq.${alertId}&select=id,status,updated_at`, { headers: H })).json())[0];
log(`alert #${alertId}: browser status "${localAlert?.status}", DB status "${dbAlert?.status}" (updated ${dbAlert?.updated_at})`);
const localIds = new Set(local.alerts.map((a) => a.id));
const dbAll = await (await fetch(`${U}/rest/v1/alerts?select=id,status`, { headers: H })).json();
const dbById = new Map(dbAll.map((a) => [a.id, a.status]));
const notInDb = [...localIds].filter((id) => !dbById.has(id));
const statusDiff = local.alerts.filter((a) => dbById.has(a.id) && dbById.get(a.id) !== a.status).map((a) => a.id);
log(`browser alerts: ${local.alerts.length}; not in DB: [${notInDb.join(',')}]; status differs: [${statusDiff.join(',')}]`);

log(`supabase requests (${reqs.length}):`);
const tally = {};
reqs.forEach((r) => (tally[r] = (tally[r] || 0) + 1));
Object.entries(tally).forEach(([k, v]) => log(`  ${v}x ${k}`));
log(`console errors (${errors.length}):`);
[...new Set(errors)].slice(0, 15).forEach((e) => log('  ' + e));

await audit('AFTER');
await appendOnlyProbe();
await dump(OUT);
