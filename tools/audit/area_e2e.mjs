import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = process.env.OUT;
const SITE = 'https://sentineleye-ebon.vercel.app';
const log = (s) => { console.log(s); fs.appendFileSync(OUT, s + '\n'); };
fs.mkdirSync('shots', { recursive: true });
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
try {
  const html = await (await fetch(SITE)).text();
  log('bundle ' + (html.match(/assets\/index-[^"]+\.js/) || ['?'])[0]);
  await p.goto(SITE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(4000);
  await p.getByRole('button', { name: /Sign in as field operator/ }).first().click();
  await p.waitForTimeout(800);
  const si = p.getByRole('button', { name: 'Sign in', exact: true });
  if (await si.count()) await si.last().click();
  await p.waitForURL(/overview/, { timeout: 20000 });
  await p.waitForTimeout(5000);
  await p.screenshot({ path: 'shots/5_overview_live.png' });
  await p.goto(SITE + '/area', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(5000);
  const t0 = Date.now();
  await p.getByRole('button', { name: /Run detection on this area/ }).click();
  await p.waitForFunction(() => /Result|No clear|HTTP|Error|failed/i.test(document.querySelector('main')?.innerText || '') && !document.body.innerText.includes('Running…'), null, { timeout: 180000 });
  log(`area scan finished in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  await p.waitForTimeout(2500);
  const main = await p.locator('main').innerText();
  const prog = main.slice(main.indexOf('Progress'), main.indexOf('Progress') + 900);
  log('--- progress ---\n' + prog);
  const m = [...main.matchAll(/(\d+)\n?\s*(Cleared to bare earth|Vegetation loss)\s*\n?\s*([\d.]+) ha\s*\n?\s*([\d.]+), ([\d.]+)/g)];
  log('patches: ' + m.slice(0, 6).map((x) => `${x[1]}:${x[2]} ${x[3]}ha @${x[4]},${x[5]}`).join(' | '));
  if (m[0]) {
    const lat = +m[0][4], lng = +m[0][5];
    const R = 6371000, r = Math.PI / 180;
    const d = 2 * R * Math.asin(Math.sqrt(Math.sin(((lat - 28.4906) * r) / 2) ** 2 + Math.cos(lat * r) * Math.cos(28.4906 * r) * Math.sin(((lng - 77.2804) * r) / 2) ** 2));
    log(`largest patch distance from documented Khori site: ${d.toFixed(0)} m`);
  }
  await p.screenshot({ path: 'shots/6_area_top.png' });
  await p.evaluate(() => document.querySelector('main')?.scrollTo(0, 99999));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: 'shots/7_area_bottom.png' });
  const save = p.getByRole('button', { name: /Save the largest patches/ });
  if (await save.count()) { await save.click(); await p.waitForTimeout(2500); log('save: ' + ((await p.locator('text=/alerts created/').first().textContent().catch(() => 'no')) || '')); }
} catch (e) {
  log('AREA E2E FAILED: ' + String(e?.stack || e).slice(0, 800));
  await p.screenshot({ path: 'shots/area_error.png' }).catch(() => {});
}
log('errors: ' + [...new Set(errs)].slice(0, 8).join(' || '));
await b.close();
