import { useState } from 'react';
import { Satellite, ExternalLink, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import type { RealSceneMetadata } from '../../types/scan.types';

const STAC_ITEM_URL = (id: string) =>
  `https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/${encodeURIComponent(id)}`;

interface CheckRow {
  label: string;
  ok: boolean;
  detail: string;
}

type VerifyState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; rows: CheckRow[] }
  | { status: 'error'; message: string };

async function verifyScene(id: string, expectedDate: string, expectedGrid?: string): Promise<CheckRow[]> {
  const res = await fetch(STAC_ITEM_URL(id), { headers: { Accept: 'application/geo+json' } });
  if (!res.ok) throw new Error(`Public catalogue answered HTTP ${res.status}`);
  const item = await res.json();
  const p = item.properties ?? {};
  const sameDate = typeof p.datetime === 'string' && p.datetime.slice(0, 19) === expectedDate.slice(0, 19);
  const rows: CheckRow[] = [
    { label: 'Scene ID exists in public archive', ok: item.id === id, detail: item.id ?? '—' },
    { label: 'Acquisition time matches', ok: sameDate, detail: p.datetime ?? '—' },
  ];
  if (expectedGrid) {
    rows.push({ label: 'MGRS tile matches', ok: p['grid:code'] === expectedGrid, detail: p['grid:code'] ?? '—' });
  }
  rows.push({
    label: 'Scene cloud cover (archive)',
    ok: true,
    detail: typeof p['eo:cloud_cover'] === 'number' ? `${p['eo:cloud_cover'].toFixed(1)}%` : '—',
  });
  return rows;
}

export function SceneProvenanceCard({ meta }: { meta: RealSceneMetadata }) {
  const [t0Check, setT0Check] = useState<VerifyState>({ status: 'idle' });
  const [t1Check, setT1Check] = useState<VerifyState>({ status: 'idle' });

  const runVerify = async () => {
    setT0Check({ status: 'running' });
    setT1Check({ status: 'running' });
    const run = async (id: string, date: string, set: (s: VerifyState) => void) => {
      try {
        set({ status: 'done', rows: await verifyScene(id, date, meta.mgrsGrid) });
      } catch (e: unknown) {
        set({
          status: 'error',
          message:
            (e instanceof Error ? e.message : 'Request failed') +
            ' — the browser could not reach the public catalogue (offline or blocked). Use the archive link instead.',
        });
      }
    };
    await Promise.all([
      run(meta.t0SceneId, meta.t0Date, setT0Check),
      run(meta.t1SceneId, meta.t1Date, setT1Check),
    ]);
  };

  const real = meta.isRealData === true;

  const sceneBlock = (label: string, id: string, date: string, cloud: number | undefined, check: VerifyState) => (
    <div className="flex flex-col gap-1">
      <span className="text-white block font-medium">{label}</span>
      <span className="break-all block">{id}</span>
      <span className="text-[10px] text-[#b5b5ad]">
        {new Date(date).toUTCString()}
        {typeof cloud === 'number' ? ` · site cloud ${cloud.toFixed(1)}%` : ''}
      </span>
      {real && (
        <a
          href={STAC_ITEM_URL(id)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[10px] text-[#facc15] hover:underline"
        >
          Open public archive record <ExternalLink className="w-3 h-3" />
        </a>
      )}
      {check.status === 'done' && (
        <ul className="mt-1 flex flex-col gap-0.5">
          {check.rows.map((r) => (
            <li key={r.label} className={`flex items-start gap-1 text-[10px] ${r.ok ? 'text-[#fde047]' : 'text-[#f87171]'}`}>
              {r.ok ? <ShieldCheck className="w-3 h-3 mt-px flex-shrink-0" /> : <ShieldAlert className="w-3 h-3 mt-px flex-shrink-0" />}
              <span>
                {r.label}: <span className="text-[#b5b5ad]">{r.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {check.status === 'error' && <span className="text-[10px] text-[#fbbf24]">{check.message}</span>}
    </div>
  );

  return (
    <div
      className={`p-3 rounded-lg bg-[#1a1a1a] border flex flex-col gap-2 font-mono text-xs ${
        real ? 'border-[#facc15]/60' : 'border-[#f59e0b]/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`font-semibold flex items-center gap-1.5 ${real ? 'text-[#facc15]' : 'text-[#fbbf24]'}`}>
          <Satellite className="w-3.5 h-3.5" />
          {real ? 'REAL DATA — Copernicus Sentinel-2 L2A' : 'Modeled site — calibrated synthetic arrays'}
        </span>
        {meta.isControl && (
          <span className="px-2 py-0.5 rounded text-[10px] bg-[#facc15]/20 text-[#facc15] border border-[#facc15]/40 font-bold">
            NEGATIVE CONTROL SITE
          </span>
        )}
      </div>

      {real && meta.sarAvailable === false && (
        <div className="px-2 py-1.5 rounded bg-[#2a1d0c] border border-[#f59e0b]/40 text-[11px] text-[#fbbf24]">
          Real Sentinel-2 only — Sentinel-1 SAR unavailable for this site. Scan ran in optical mode; detections are
          vegetation-loss candidates that need human verification.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-[#b5b5ad] pt-1 border-t border-[#2e2e2e]">
        {sceneBlock('T0 (before) scene', meta.t0SceneId, meta.t0Date, meta.t0CloudPct, t0Check)}
        {sceneBlock('T1 (after) scene', meta.t1SceneId, meta.t1Date, meta.t1CloudPct, t1Check)}
      </div>

      {real && (
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-[#2e2e2e]">
          <span className="text-[10px] text-[#b5b5ad]">
            {meta.mgrsGrid ? `MGRS tile ${meta.mgrsGrid} · ` : ''}
            {meta.aoiBbox ? `site ${meta.aoiBbox.map((v) => v.toFixed(4)).join(', ')}` : ''}
          </span>
          <button
            type="button"
            onClick={runVerify}
            disabled={t0Check.status === 'running'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#facc15] text-[#0a0a0a] hover:bg-[#eab308] disabled:opacity-60"
          >
            {t0Check.status === 'running' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            Verify live against public STAC
          </button>
        </div>
      )}
      {real && (
        <span className="text-[10px] text-[#77776f]">Contains modified Copernicus Sentinel data, processed by SentinelEye.</span>
      )}
    </div>
  );
}
