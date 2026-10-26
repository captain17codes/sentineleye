import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Play, Loader2, Scale, Satellite } from 'lucide-react';
import {
  analyzeSurfaceChange,
  changeOverlayRGBA,
  CHANGE_CLASSES,
  SurfaceChangeResult,
  SpectralBands,
  pixelToLngLat,
  distanceM,
} from '../engine/scan/surfaceChange';

/**
 * Ground-truth cases: court-documented land-change events, analysed with the same
 * multi-index engine on real Copernicus Sentinel-2 L2A data. A real control site
 * (Asola Bhatti, Z-104) gives the background level of change.
 */

const SIZE = 256;
// no data, saturated, cloud shadow, water, cloud, cirrus
const BAD_SCL = new Set([0, 1, 3, 6, 8, 9, 10]);

// What a visual check of the true-colour images shows, written after running each case.
const OBSERVED: Record<string, { tone: 'match' | 'mismatch' | 'mixed'; text: string }> = {
  'khori-gaon': {
    tone: 'match',
    text: 'Match. The dense settlement visible in 2021 is bare, brown ground in 2022, and the largest detected cluster sits on that area.',
  },
  'kot-dhauj-mining': {
    tone: 'mismatch',
    text: 'False positive. The images show green wheat fields in March 2021 and harvested fields in April 2024; the clusters are mostly crop harvest, not quarrying. Separating these needs radar or a time series.',
  },
  'yamuna-zone-o': {
    tone: 'mixed',
    text: 'Mixed. Lower river water in 2025 exposes sand bars and floodplain vegetation changes; the reported clearance is not isolated from these natural changes.',
  },
};

interface CaseEntry {
  zone_id: string;
  code: string;
  name: string;
  event?: string;
  expected_change?: string;
  citation?: string;
  source_url?: string;
  center: [number, number];
  t0: { scene_id: string; datetime: string; aoi_cloud_pct: number };
  t1: { scene_id: string; datetime: string; aoi_cloud_pct: number };
}

interface SceneFile extends SpectralBands {
  bbox: [number, number, number, number];
  scene_id: string;
  datetime: string;
  scl: number[];
  red: number[];
  nir: number[];
  blue: number[];
  swir16: number[];
}

type Analysis = { result: SurfaceChangeResult; overlay: Uint8ClampedArray; bbox: [number, number, number, number] };

async function loadPair(dir: string): Promise<[SceneFile, SceneFile]> {
  const [a, b] = await Promise.all([fetch(`${dir}/t0.json`), fetch(`${dir}/t1.json`)]);
  if (!a.ok || !b.ok) throw new Error('Scene files not found');
  return [await a.json(), await b.json()];
}

function analysePair(t0: SceneFile, t1: SceneFile): Analysis {
  if (!t0.swir16 || !t1.swir16 || !t0.blue || !t1.blue) {
    throw new Error('This scene has no SWIR/blue bands yet');
  }
  const invalid = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < invalid.length; i++) {
    if (BAD_SCL.has(t0.scl[i]) || BAD_SCL.has(t1.scl[i])) invalid[i] = 1;
  }
  const result = analyzeSurfaceChange(t0, t1, invalid, SIZE);
  return { result, overlay: changeOverlayRGBA(result.classMap, SIZE), bbox: t0.bbox };
}

const changedShare = (r: SurfaceChangeResult) => r.changedShare;
const largest = (r: SurfaceChangeResult) => (r.clusters[0] ? r.clusters[0].areaM2 : 0);

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const ha = (m2: number) => `${(m2 / 10000).toFixed(1)} ha`;
const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function OverlayCanvas({ base, overlay }: { base: string; overlay: Uint8ClampedArray | null }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      if (overlay) {
        const tmp = document.createElement('canvas');
        tmp.width = SIZE;
        tmp.height = SIZE;
        tmp.getContext('2d')?.putImageData(new ImageData(new Uint8ClampedArray(overlay), SIZE, SIZE), 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tmp, 0, 0, 512, 512);
      }
    };
    img.src = base;
  }, [base, overlay]);
  return <canvas ref={ref} width={512} height={512} className="w-full aspect-square rounded-md border border-[#222c3d]" />;
}

function verdict(a: Analysis, control: SurfaceChangeResult | null, documented: [number, number]) {
  const top = a.result.clusters[0];
  if (!top) return { tone: 'none', text: 'No compact change cluster found.' };
  const at = pixelToLngLat(top.cx, top.cy, a.bbox, SIZE);
  const dist = distanceM(at, documented);
  const where = `Largest cluster: ${ha(top.areaM2)} at ${at[1].toFixed(4)} N, ${at[0].toFixed(4)} E, ${
    dist < 1000 ? `${Math.round(dist)} m` : `${(dist / 1000).toFixed(1)} km`
  } from the documented location.`;
  if (!control || !control.clusters[0]) return { tone: 'neutral', text: where };
  const ratio = top.areaM2 / largest(control);
  const cmp = `That is ${ratio.toFixed(1)}× the largest cluster at the control site (${ha(largest(control))}).`;
  if (ratio >= 2) return { tone: 'strong', text: `${where} ${cmp} Strong, localised change.` };
  if (ratio >= 1.3) return { tone: 'weak', text: `${where} ${cmp} Moderate signal.` };
  return { tone: 'none', text: `${where} ${cmp} Not clearly above background.` };
}

export function Cases() {
  const [cases, setCases] = useState<CaseEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [control, setControl] = useState<SurfaceChangeResult | null>(null);
  const [runs, setRuns] = useState<Record<string, Analysis | 'running' | string>>({});

  useEffect(() => {
    fetch('/real/cases/manifest.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('No case data published yet'))))
      .then((m) => setCases((m.zones || []) as CaseEntry[]))
      .catch((e) => setError(e.message));
    // Background level from the real control site (Asola Bhatti, Z-104)
    loadPair('/real/104')
      .then(([a, b]) => setControl(analysePair(a, b).result))
      .catch(() => setControl(null));
  }, []);

  const run = async (c: CaseEntry) => {
    setRuns((s) => ({ ...s, [c.zone_id]: 'running' }));
    try {
      const [t0, t1] = await loadPair(`/real/cases/${c.zone_id}`);
      const a = analysePair(t0, t1);
      setRuns((s) => ({ ...s, [c.zone_id]: a }));
    } catch (e) {
      setRuns((s) => ({ ...s, [c.zone_id]: e instanceof Error ? e.message : 'Failed' }));
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="pb-4 border-b border-[#222c3d]">
        <h1 className="text-xl font-semibold text-[#e6eaf0]">Ground-truth cases</h1>
        <p className="text-sm text-[#98a2b3] mt-1 max-w-3xl">
          Land-change events documented by courts and news reports, analysed with the same engine on real Copernicus
          Sentinel-2 L2A images. The engine combines NDVI (vegetation), the bare-soil index BSI (uses the SWIR band) and a
          redness index (bright roofs turning to brown earth), removes whole-scene seasonal shifts, and keeps only compact
          change clusters. The real control site at Asola Bhatti (Z-104) gives the normal background level of change.
        </p>
        {control && (
          <p className="text-xs text-[#6f7a8c] mt-2">
            Control background (Z-104, 2022 → 2026): {pct(changedShare(control))} of the site in change clusters, largest
            cluster {ha(largest(control))}.
          </p>
        )}
      </div>

      {error && <div className="p-4 rounded-md border border-[#222c3d] text-sm text-[#98a2b3]">{error}</div>}

      {cases.map((c) => {
        const state = runs[c.zone_id];
        const a = state && typeof state === 'object' ? (state as Analysis) : null;
        const v = a ? verdict(a, control, c.center) : null;
        const obs = OBSERVED[c.zone_id];
        return (
          <section key={c.zone_id} className="p-5 rounded-lg bg-[#111826] border border-[#222c3d] flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-3xl">
                <span className="text-xs font-mono text-[#facc15]">{c.code}</span>
                <h2 className="text-lg font-semibold text-[#e6eaf0]">{c.name}</h2>
                <p className="text-sm text-[#98a2b3] mt-1">{c.event}</p>
                <p className="text-xs text-[#6f7a8c] mt-2 flex items-start gap-1.5">
                  <Scale className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>
                    {c.citation}
                    {c.source_url && (
                      <a href={c.source_url} target="_blank" rel="noreferrer" className="ml-2 text-[#facc15] inline-flex items-center gap-1 hover:underline">
                        source <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => run(c)}
                disabled={state === 'running'}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-[#facc15] text-[#0b1018] text-sm font-semibold hover:bg-[#eab308] disabled:opacity-60"
              >
                {state === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Run analysis
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <figure className="flex flex-col gap-1.5">
                <img src={`/real/cases/${c.zone_id}/t0_rgb.png`} alt={`${c.name} before`} className="w-full aspect-square rounded-md border border-[#222c3d]" />
                <figcaption className="text-xs text-[#98a2b3]">
                  Before · {day(c.t0.datetime)} <span className="font-mono text-[#6f7a8c]">{c.t0.scene_id}</span>
                </figcaption>
              </figure>
              <figure className="flex flex-col gap-1.5">
                <img src={`/real/cases/${c.zone_id}/t1_rgb.png`} alt={`${c.name} after`} className="w-full aspect-square rounded-md border border-[#222c3d]" />
                <figcaption className="text-xs text-[#98a2b3]">
                  After · {day(c.t1.datetime)} <span className="font-mono text-[#6f7a8c]">{c.t1.scene_id}</span>
                </figcaption>
              </figure>
              <figure className="flex flex-col gap-1.5">
                <OverlayCanvas base={`/real/cases/${c.zone_id}/t1_rgb.png`} overlay={a?.overlay ?? null} />
                <figcaption className="text-xs text-[#98a2b3]">
                  {a ? 'Detected change on the after image' : 'Run the analysis to see detected change'}
                </figcaption>
              </figure>
            </div>

            {typeof state === 'string' && state !== 'running' && <p className="text-sm text-[#f87171]">{state}</p>}

            {a && v && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  {CHANGE_CLASSES.filter((k) => k.id > 0).map((k) => (
                    <span key={k.key} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#172031] border border-[#222c3d] text-xs text-[#e6eaf0]">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: `rgba(${k.color[0]},${k.color[1]},${k.color[2]},1)` }} />
                      {k.label}: <span className="font-mono">{ha(a.result.areaM2[k.key])}</span>
                    </span>
                  ))}
                </div>
                <p className="text-xs font-mono text-[#6f7a8c]">
                  {a.result.clusters.length} change clusters · {pct(a.result.changedShare)} of the site · whole-scene shift removed: ΔNDVI{' '}
                  {a.result.sceneShift.ndvi.toFixed(3)}, ΔBSI {a.result.sceneShift.bsi.toFixed(3)} · valid pixels {a.result.validPixels.toLocaleString()}
                </p>
                <p
                  className={`text-sm px-3 py-2 rounded-md border ${
                    v.tone === 'strong'
                      ? 'border-[#facc15]/60 text-[#facc15] bg-[#2a2405]'
                      : v.tone === 'weak'
                      ? 'border-[#f59e0b]/40 text-[#fbbf24]'
                      : 'border-[#222c3d] text-[#98a2b3]'
                  }`}
                >
                  {v.text} Expected event: {c.expected_change}.
                </p>
                {obs && (
                  <p
                    className={`text-sm px-3 py-2 rounded-md border ${
                      obs.tone === 'match'
                        ? 'border-[#22c55e]/50 text-[#86efac]'
                        : obs.tone === 'mismatch'
                        ? 'border-[#ef4444]/50 text-[#fca5a5]'
                        : 'border-[#64748b]/60 text-[#cbd5e1]'
                    }`}
                  >
                    <span className="font-semibold">Visual check of the images: </span>
                    {obs.text}
                  </p>
                )}
              </div>
            )}
          </section>
        );
      })}

      <p className="text-xs text-[#6f7a8c] flex items-center gap-1.5">
        <Satellite className="w-3.5 h-3.5" /> Contains modified Copernicus Sentinel data. Coordinates are approximate and come
        from public sources; every detection is a candidate for an officer to verify.
      </p>
    </div>
  );
}

export default Cases;
