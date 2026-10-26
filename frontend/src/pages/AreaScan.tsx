import React, { useMemo, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { MapContainer, TileLayer, Polygon, Marker, ImageOverlay, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as turf from '@turf/turf';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, Cell } from 'recharts';
import { Check, Loader2, MousePointerSquareDashed, Play, Satellite, Save, RotateCcw, AlertCircle } from 'lucide-react';
import {
  searchScenes,
  loadScene,
  areaCloudShare,
  invalidMask,
  rgbPreview,
  areaSizeM,
  type BBox,
  type StacScene,
  type SceneData,
} from '../engine/aoi/liveSentinel';
import { analyzeSurfaceChange, changeOverlayRGBA, pixelToLngLat, ndviAt, rednessAt, bsiAt, DEFAULT_SURFACE_THRESHOLDS } from '../engine/scan/surfaceChange';
import { addAlert } from '../engine/store/alertStore';
import { addLedgerRecord } from '../engine/ledger';
import { SEEDED_ZONES } from '../api/seededData';
import type { Alert } from '../types/alert.types';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer';
const card = 'rounded-xl border border-[#1e2738] bg-[#0f1522]';
const AOI = '#67e8f9';
const MAX_SIDE_M = 5000;

const PRESETS: { name: string; note: string; bbox: BBox; t0: string; t1: string }[] = [
  { name: 'Khori Gaon', note: 'Court-ordered demolition, 2021', bbox: [77.2673172, 28.4791016, 77.2934828, 28.5020984], t0: '2021-03', t1: '2022-03' },
  { name: 'Mangar Bani', note: 'Sacred grove, Aravallis', bbox: [77.1592218, 28.3610016, 77.1853582, 28.3839984], t0: '2022-03', t1: '2026-04' },
  { name: 'Kot / Dhauj', note: 'Reported quarrying area', bbox: [77.1610377, 28.3134016, 77.1871623, 28.3363984], t0: '2021-04', t1: '2024-04' },
];

type Step = { label: string; state: 'todo' | 'run' | 'done' | 'fail'; detail?: string };

interface Patch {
  n: number;
  lng: number;
  lat: number;
  ha: number;
  kind: 'cleared' | 'veg_loss';
}
interface Result {
  t0: SceneData;
  t1: SceneData;
  size: number;
  bbox: BBox;
  before: string;
  after: string;
  overlay: string;
  heat: string[]; // 4 layers for the 3D view
  patches: Patch[];
  changedHa: number;
  validShare: number;
  zoneName: string | null;
  zoneId: number;
}

const toUrl = (rgba: Uint8ClampedArray, size: number, type = 'image/png') => {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  c.getContext('2d')!.putImageData(new ImageData(rgba, size, size), 0, 0);
  return c.toDataURL(type, 0.85);
};
const monthRange = (ym: string, widen = 0): [string, string] => {
  const [y, m] = ym.split('-').map(Number);
  const a = new Date(Date.UTC(y, m - 1 - widen, 1));
  const b = new Date(Date.UTC(y, m + widen, 0, 23, 59, 59));
  return [a.toISOString(), b.toISOString()];
};
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function corners(b: BBox): [number, number][] {
  return [
    [b[3], b[0]],
    [b[3], b[2]],
    [b[1], b[2]],
    [b[1], b[0]],
  ];
}
const cornerIcon = (label: string) =>
  L.divIcon({
    className: '',
    html: `<span style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:999px;border:1.5px solid ${AOI};background:#0b1018cc;color:${AOI};font:600 11px Inter,sans-serif;transform:translate(-50%,-50%)">${label}</span>`,
  });

function DrawBox({ active, onDone }: { active: boolean; onDone: (b: BBox) => void }) {
  const start = useRef<L.LatLng | null>(null);
  const [cur, setCur] = useState<BBox | null>(null);
  const map = useMapEvents({
    mousedown(e) {
      if (!active) return;
      map.dragging.disable();
      start.current = e.latlng;
    },
    mousemove(e) {
      if (!active || !start.current) return;
      const s = start.current;
      setCur([Math.min(s.lng, e.latlng.lng), Math.min(s.lat, e.latlng.lat), Math.max(s.lng, e.latlng.lng), Math.max(s.lat, e.latlng.lat)]);
    },
    mouseup() {
      if (!active || !start.current) return;
      map.dragging.enable();
      start.current = null;
      if (cur) onDone(cur);
      setCur(null);
    },
  });
  return cur ? <Polygon positions={corners(cur)} pathOptions={{ color: AOI, weight: 1.5, dashArray: '6 6', fillOpacity: 0.05 }} /> : null;
}

function FlyTo({ bbox }: { bbox: BBox }) {
  const map = useMap();
  React.useEffect(() => {
    map.fitBounds(
      [
        [bbox[1], bbox[0]],
        [bbox[3], bbox[2]],
      ],
      { padding: [60, 60], maxZoom: 15 }
    );
  }, [bbox, map]);
  return null;
}

export function AreaScan() {
  const [bbox, setBbox] = useState<BBox>(PRESETS[0].bbox);
  const [t0m, setT0m] = useState(PRESETS[0].t0);
  const [t1m, setT1m] = useState(PRESETS[0].t1);
  const [drawing, setDrawing] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [saved, setSaved] = useState(0);
  const [rot, setRot] = useState(-28);
  const drag = useRef<number | null>(null);

  const size = areaSizeM(bbox);
  const tooBig = Math.max(size.w, size.h) > MAX_SIDE_M;
  const zone = useMemo(() => {
    const c = turf.point([(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]);
    return SEEDED_ZONES.find((z) => turf.booleanPointInPolygon(c, JSON.parse(z.geojson))) || null;
  }, [bbox]);

  const setStep = (i: number, patch: Partial<Step>) => setSteps((s) => s.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  async function pickScene(month: string, label: string, stepIdx: number): Promise<StacScene> {
    for (const widen of [0, 1, 2]) {
      const [a, b] = monthRange(month, widen);
      const found = await searchScenes(bbox, a, b, 40);
      setStep(stepIdx, { detail: `${found.length} ${label} scenes found${widen ? ` (±${widen} month)` : ''}, checking cloud over your area…` });
      let best: { s: StacScene; c: number } | null = null;
      for (const s of found.slice(0, 5)) {
        const c = await areaCloudShare(s, bbox, 96);
        if (!best || c < best.c) best = { s, c };
        if (c < 0.1) break;
      }
      if (best && best.c < 0.3) return best.s;
    }
    throw new Error(`No clear ${label} image found near ${month}. Try another month.`);
  }

  async function run() {
    if (tooBig) return;
    setRunning(true);
    setError(null);
    setResult(null);
    setSaved(0);
    setSteps([
      { label: 'Search the Copernicus archive (Earth Search STAC)', state: 'run' },
      { label: 'Pick the clearest before image', state: 'todo' },
      { label: 'Pick the clearest after image', state: 'todo' },
      { label: 'Read 6 bands × 2 dates for your area only', state: 'todo' },
      { label: 'Detect change (NDVI, BSI, redness) and group pixels', state: 'todo' },
    ]);
    try {
      setStep(0, { state: 'done', detail: 'earth-search.aws.element84.com · sentinel-2-l2a' });
      setStep(1, { state: 'run' });
      const s0 = await pickScene(t0m, 'before', 1);
      setStep(1, { state: 'done', detail: `${s0.id} · ${fmtDate(s0.datetime)}` });
      setStep(2, { state: 'run' });
      const s1 = await pickScene(t1m, 'after', 2);
      setStep(2, { state: 'done', detail: `${s1.id} · ${fmtDate(s1.datetime)}` });

      const m = areaSizeM(bbox);
      const n = Math.max(64, Math.min(400, Math.round(Math.max(m.w, m.h) / 10)));
      setStep(3, { state: 'run', detail: `${n} × ${n} pixels` });
      let done = 0;
      const tick = () => setStep(3, { detail: `${n} × ${n} pixels · ${++done}/12 bands read` });
      const [d0, d1] = await Promise.all([loadScene(s0, bbox, n, tick), loadScene(s1, bbox, n, tick)]);
      setStep(3, { state: 'done', detail: `${n} × ${n} pixels · 12 bands read` });

      setStep(4, { state: 'run' });
      const pixelArea = (m.w * m.h) / (n * n);
      const inv = invalidMask(d0.scl, d1.scl);
      const th = { ...DEFAULT_SURFACE_THRESHOLDS, minClusterPx: Math.max(4, Math.round(2500 / pixelArea)) };
      const r = analyzeSurfaceChange(d0.bands, d1.bands, inv, n, th, pixelArea);

      // magnitude for the 3D view
      const heat = [0, 1, 2, 3].map(() => new Uint8ClampedArray(n * n * 4));
      const cols: [number, number, number][] = [
        [59, 130, 246],
        [34, 211, 238],
        [250, 204, 21],
        [239, 68, 68],
      ];
      for (let i = 0; i < n * n; i++) {
        if (r.classMap[i] !== 1 && r.classMap[i] !== 2) continue;
        const dn = -(ndviAt(d1.bands, i) - ndviAt(d0.bands, i) - r.sceneShift.ndvi);
        const dr = rednessAt(d1.bands, i) - rednessAt(d0.bands, i) - r.sceneShift.redness;
        const db = bsiAt(d1.bands, i) - bsiAt(d0.bands, i) - r.sceneShift.bsi;
        const mag = Math.max(dn, dr * 2, db);
        const lvl = mag > 0.45 ? 3 : mag > 0.3 ? 2 : mag > 0.18 ? 1 : 0;
        const [cr, cg, cb] = cols[lvl];
        const L4 = heat[lvl];
        L4[i * 4] = cr;
        L4[i * 4 + 1] = cg;
        L4[i * 4 + 2] = cb;
        L4[i * 4 + 3] = 235;
      }

      const patches: Patch[] = r.clusters.slice(0, 12).map((c, k) => {
        const [lng, lat] = pixelToLngLat(c.cx, c.cy, bbox, n);
        return { n: k + 1, lng, lat, ha: c.areaM2 / 1e4, kind: c.kind === 'cleared' ? 'cleared' : 'veg_loss' };
      });
      const res: Result = {
        t0: d0,
        t1: d1,
        size: n,
        bbox,
        before: toUrl(rgbPreview(d0.bands, n), n, 'image/jpeg'),
        after: toUrl(rgbPreview(d1.bands, n), n, 'image/jpeg'),
        overlay: toUrl(changeOverlayRGBA(r.classMap, n), n),
        heat: heat.map((h) => toUrl(h, n)),
        patches,
        changedHa: r.changedAreaM2 / 1e4,
        validShare: r.validPixels / (n * n),
        zoneName: zone?.name || null,
        zoneId: zone?.id || 0,
      };
      setResult(res);
      setStep(4, { state: 'done', detail: `${r.clusters.length} changed patches · ${(r.changedAreaM2 / 1e4).toFixed(1)} ha` });
      await addLedgerRecord('SCENE_INGEST', {
        kind: 'AREA_SCAN',
        bbox,
        t0_scene_id: s0.id,
        t1_scene_id: s1.id,
        patches: patches.length,
        changed_ha: Number((r.changedAreaM2 / 1e4).toFixed(2)),
      });
    } catch (e: any) {
      setError(e?.message || String(e));
      setSteps((s) => s.map((x) => (x.state === 'run' ? { ...x, state: 'fail' } : x)));
    } finally {
      setRunning(false);
    }
  }

  async function saveAlerts() {
    if (!result) return;
    const keep = result.patches.filter((p) => p.ha >= 0.25).slice(0, 5);
    for (const p of keep) {
      const id = Date.now() + p.n;
      const alert: Alert = {
        id,
        scan_id: id,
        zone_id: result.zoneId,
        zone_name: result.zoneName || 'Custom area',
        class: p.kind === 'cleared' ? 'Land Encroachment' : 'Deforestation',
        severity: p.ha >= 5 ? 'CRITICAL' : p.ha >= 1 ? 'HIGH' : p.ha >= 0.5 ? 'MEDIUM' : 'LOW',
        status: 'New',
        lat: p.lat,
        lng: p.lng,
        area_m2: Math.round(p.ha * 1e4),
        overlap_pct: result.zoneId ? 100 : 0,
        before_img: result.before,
        after_img: result.after,
        description: `[REAL Sentinel-2 L2A ${result.t0.scene.id} → ${result.t1.scene.id}] ${
          p.kind === 'cleared' ? 'Surface cleared to bare earth' : 'Vegetation loss'
        } of ${p.ha.toFixed(2)} ha found by an area scan.`,
        created_at: new Date().toISOString(),
        is_real_scene: true,
        data_source: 'real',
        t0_scene_id: result.t0.scene.id,
        t1_scene_id: result.t1.scene.id,
        t0_timestamp: result.t0.scene.datetime,
        t1_timestamp: result.t1.scene.datetime,
      };
      addAlert(alert);
      await addLedgerRecord('DETECTION', { alertId: id, source: 'AREA_SCAN', t0: result.t0.scene.id, t1: result.t1.scene.id, area_m2: alert.area_m2, lat: p.lat, lng: p.lng });
    }
    setSaved(keep.length);
  }

  return (
    <div className="max-w-[1500px] mx-auto flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[#eef2f7]">Area scan</h1>
          <p className="text-sm text-[#98a2b3] mt-1">
            Draw any area up to 5 × 5 km, pick two dates, and the app reads real Sentinel-2 images of exactly that area and finds what changed.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* map */}
        <div className={`xl:col-span-8 ${card} relative overflow-hidden h-[600px]`}>
          <MapContainer center={[28.49, 77.28]} zoom={13} zoomControl={false} attributionControl={false} className="w-full h-full overview-map" style={{ cursor: drawing ? 'crosshair' : '' }}>
            <TileLayer url={`${ESRI}/tile/{z}/{y}/{x}`} maxZoom={18} />
            <FlyTo bbox={bbox} />
            <DrawBox
              active={drawing}
              onDone={(b) => {
                setBbox(b);
                setDrawing(false);
                setResult(null);
                setSteps([]);
              }}
            />
            {result && result.bbox === bbox && (
              <ImageOverlay
                url={result.overlay}
                bounds={[
                  [bbox[1], bbox[0]],
                  [bbox[3], bbox[2]],
                ]}
                opacity={0.9}
              />
            )}
            <Polygon positions={corners(bbox)} pathOptions={{ color: AOI, weight: 1.5, dashArray: '6 6', fillOpacity: result ? 0 : 0.04 }} />
            {corners(bbox).map((c, i) => (
              <Marker key={i} position={c} icon={cornerIcon('ABCD'[i])} interactive={false} />
            ))}
            {result?.patches.slice(0, 6).map((p) => (
              <CircleMarker key={p.n} center={[p.lat, p.lng]} radius={9} pathOptions={{ color: '#fff', weight: 1.5, fillOpacity: 0 }}>
                <Tooltip permanent direction="right" offset={[10, 0]}>
                  <span className="text-xs">
                    {p.n} · {p.ha.toFixed(1)} ha
                  </span>
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>

          <div className="absolute top-4 left-4 z-[500] flex flex-col gap-2 w-60">
            <button
              onClick={() => setDrawing((d) => !d)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[13px] backdrop-blur ${
                drawing ? 'border-[#67e8f9]/60 bg-[#67e8f9]/15 text-[#a5f3fc]' : 'border-white/10 bg-[#0b1018]/85 text-[#e6eaf0] hover:bg-[#111826]'
              }`}
            >
              <MousePointerSquareDashed className="w-4 h-4" />
              {drawing ? 'Drag on the map to draw…' : 'Draw an area'}
            </button>
            <div className="rounded-lg border border-white/10 bg-[#0b1018]/85 backdrop-blur p-1.5">
              <p className="px-2 pt-1 pb-1.5 text-[10px] uppercase tracking-[0.16em] text-[#6f7a8c]">Known sites</p>
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => {
                    setBbox(p.bbox);
                    setT0m(p.t0);
                    setT1m(p.t1);
                    setResult(null);
                    setSteps([]);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded-md hover:bg-white/5"
                >
                  <span className="block text-[13px] text-[#e6eaf0]">{p.name}</span>
                  <span className="block text-[11px] text-[#7d8798]">{p.note}</span>
                </button>
              ))}
            </div>
          </div>
          <span className="absolute bottom-2 right-3 z-[500] text-[10px] text-[#c9d1dc]/70">Imagery © Esri (map) · analysis on Copernicus Sentinel-2</span>
        </div>

        {/* control panel */}
        <div className="xl:col-span-4 flex flex-col gap-5">
          <div className={`${card} p-4 flex flex-col gap-3`}>
            <h3 className="text-[15px] font-medium text-[#eef2f7]">Your area</h3>
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <span className="px-2.5 py-2 rounded-md border border-[#1b2331] bg-[#0c111c] text-[#98a2b3]">
                Size <span className="block text-[#e6eaf0] text-[13px]">{(size.w / 1000).toFixed(2)} × {(size.h / 1000).toFixed(2)} km</span>
              </span>
              <span className="px-2.5 py-2 rounded-md border border-[#1b2331] bg-[#0c111c] text-[#98a2b3]">
                Protected zone <span className="block text-[#e6eaf0] text-[13px] truncate">{zone ? zone.code : 'Outside zones'}</span>
              </span>
            </div>
            {tooBig && <p className="text-[12px] text-[#fca5a5]">Area is larger than 5 km on a side. Draw a smaller box.</p>}
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[12px] text-[#98a2b3]">
                Before
                <input type="month" value={t0m} max={t1m} onChange={(e) => setT0m(e.target.value)} className="mt-1 w-full rounded-md px-2 py-1.5 text-[13px]" />
              </label>
              <label className="text-[12px] text-[#98a2b3]">
                After
                <input type="month" value={t1m} min={t0m} onChange={(e) => setT1m(e.target.value)} className="mt-1 w-full rounded-md px-2 py-1.5 text-[13px]" />
              </label>
            </div>
            <p className="text-[11px] text-[#6f7a8c]">Pick the same season in both years so crops and monsoon greening do not look like change.</p>
            <button
              onClick={run}
              disabled={running || tooBig}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#facc15] text-[#0b1018] text-[13px] font-medium hover:bg-[#fde047] disabled:opacity-50"
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? 'Running…' : 'Run detection on this area'}
            </button>
          </div>

          {steps.length > 0 && (
            <div className={`${card} p-4`}>
              <h3 className="text-[15px] font-medium text-[#eef2f7] mb-3">Progress</h3>
              <ol className="flex flex-col gap-2.5">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span
                      className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border ${
                        s.state === 'done'
                          ? 'border-[#4ade80]/50 text-[#4ade80]'
                          : s.state === 'run'
                          ? 'border-[#67e8f9]/50 text-[#67e8f9]'
                          : s.state === 'fail'
                          ? 'border-[#f87171]/50 text-[#f87171]'
                          : 'border-[#2a3446] text-[#5d6778]'
                      }`}
                    >
                      {s.state === 'done' ? <Check className="w-3 h-3" /> : s.state === 'run' ? <Loader2 className="w-3 h-3 animate-spin" /> : s.state === 'fail' ? '!' : i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-[13px] ${s.state === 'todo' ? 'text-[#6f7a8c]' : 'text-[#e6eaf0]'}`}>{s.label}</span>
                      {s.detail && <span className="block text-[11px] text-[#7d8798] font-mono break-all">{s.detail}</span>}
                    </span>
                  </li>
                ))}
              </ol>
              {error && (
                <p className="mt-3 flex gap-2 text-[12px] text-[#fca5a5]">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </p>
              )}
            </div>
          )}

          {result && (
            <div className={`${card} p-4 flex flex-col gap-3`}>
              <h3 className="text-[15px] font-medium text-[#eef2f7]">Result</h3>
              <div className="grid grid-cols-3 gap-2 text-[12px]">
                {[
                  { k: 'Changed', v: `${result.changedHa.toFixed(1)} ha` },
                  { k: 'Patches', v: result.patches.length },
                  { k: 'Clear pixels', v: `${Math.round(result.validShare * 100)}%` },
                ].map((x) => (
                  <span key={x.k} className="px-2.5 py-2 rounded-md border border-[#1b2331] bg-[#0c111c] text-[#98a2b3]">
                    {x.k}
                    <span className="block text-[#eef2f7] text-[15px] font-medium">{x.v}</span>
                  </span>
                ))}
              </div>
              <ul className="flex flex-col divide-y divide-[#1b2331] text-[12px] max-h-44 overflow-y-auto">
                {result.patches.map((p) => (
                  <li key={p.n} className="flex items-center gap-2 py-1.5">
                    <span className="w-5 text-[#7d8798]">{p.n}</span>
                    <span className="w-2 h-2 rounded-full" style={{ background: p.kind === 'cleared' ? '#ef4444' : '#facc15' }} />
                    <span className="flex-1 text-[#e6eaf0]">{p.kind === 'cleared' ? 'Cleared to bare earth' : 'Vegetation loss'}</span>
                    <span className="text-[#eef2f7]">{p.ha.toFixed(2)} ha</span>
                    <span className="text-[#6f7a8c] font-mono">{p.lat.toFixed(4)}, {p.lng.toFixed(4)}</span>
                  </li>
                ))}
                {!result.patches.length && <li className="py-2 text-[#98a2b3]">No significant change found in this area.</li>}
              </ul>
              {saved ? (
                <NavLink to="/alerts" className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[#4ade80]/40 text-[#86efac] text-[13px]">
                  <Check className="w-4 h-4" /> {saved} alerts created · open Alerts
                </NavLink>
              ) : (
                <button
                  onClick={saveAlerts}
                  disabled={!result.patches.some((p) => p.ha >= 0.25)}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[#222c3d] bg-[#111826] text-[13px] text-[#e6eaf0] hover:border-[#2f3a4d] disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> Save the largest patches as alerts
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* 3D view */}
          <div className={`xl:col-span-7 ${card} p-4`}>
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-medium text-[#eef2f7]">3D view of the change</h3>
              <button onClick={() => setRot(-28)} className="flex items-center gap-1 text-[12px] text-[#98a2b3] hover:text-[#e6eaf0]">
                <RotateCcw className="w-3.5 h-3.5" /> Reset view
              </button>
            </div>
            <p className="text-[12px] text-[#7d8798]">Drag to rotate. Higher, warmer points changed more.</p>
            <div
              className="h-[380px] flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
              style={{ perspective: '1100px' }}
              onPointerDown={(e) => (drag.current = e.clientX)}
              onPointerMove={(e) => {
                if (drag.current === null) return;
                setRot((r) => r + (e.clientX - (drag.current as number)) * 0.4);
                drag.current = e.clientX;
              }}
              onPointerUp={() => (drag.current = null)}
              onPointerLeave={() => (drag.current = null)}
            >
              <div className="relative w-[300px] h-[300px]" style={{ transformStyle: 'preserve-3d', transform: `rotateX(58deg) rotateZ(${rot}deg)` }}>
                <img src={result.after} alt="" className="absolute inset-0 w-full h-full opacity-60 rounded-sm" style={{ imageRendering: 'pixelated' }} draggable={false} />
                <div className="absolute inset-0 border border-dashed" style={{ borderColor: AOI }} />
                {result.heat.map((h, i) => (
                  <img
                    key={i}
                    src={h}
                    alt=""
                    draggable={false}
                    className="absolute inset-0 w-full h-full"
                    style={{ transform: `translateZ(${12 + i * 16}px)`, imageRendering: 'pixelated' }}
                  />
                ))}
                <div className="absolute inset-0 border border-dashed opacity-60" style={{ borderColor: AOI, transform: 'translateZ(80px)' }} />
                {['A', 'B', 'C', 'D'].map((l, i) => (
                  <span
                    key={l}
                    className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border text-[10px] flex items-center justify-center bg-[#0b1018]"
                    style={{ borderColor: AOI, color: AOI, left: i === 1 || i === 2 ? '100%' : '0%', top: i >= 2 ? '100%' : '0%', transform: 'translateZ(80px)' }}
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-[#98a2b3]">
              {[
                ['#3b82f6', 'Small change'],
                ['#22d3ee', 'Moderate'],
                ['#facc15', 'Strong'],
                ['#ef4444', 'Very strong'],
              ].map(([c, l]) => (
                <span key={l} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} /> {l}
                </span>
              ))}
            </div>
          </div>

          <div className="xl:col-span-5 flex flex-col gap-5">
            <div className={`${card} p-4`}>
              <h3 className="text-[15px] font-medium text-[#eef2f7] mb-3">Images used</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { src: result.before, s: result.t0 },
                  { src: result.after, s: result.t1 },
                ].map(({ src, s }) => (
                  <figure key={s.scene.id}>
                    <img src={src} alt="" className="w-full aspect-square object-cover rounded-md border border-[#1b2331]" style={{ imageRendering: 'pixelated' }} />
                    <figcaption className="mt-1.5 text-[12px] text-[#e6eaf0]">{fmtDate(s.scene.datetime)}</figcaption>
                    <figcaption className="text-[10px] text-[#6f7a8c] font-mono break-all">{s.scene.id}</figcaption>
                    <figcaption className="text-[10px] text-[#6f7a8c]">cloud over area {Math.round(s.invalidShare * 100)}%</figcaption>
                  </figure>
                ))}
              </div>
            </div>
            <div className={`${card} p-4`}>
              <h3 className="text-[15px] font-medium text-[#eef2f7] mb-2">Patch sizes (ha)</h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result.patches.map((p) => ({ n: String(p.n), ha: Number(p.ha.toFixed(2)), kind: p.kind }))} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <XAxis dataKey="n" stroke="#6f7a8c" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6f7a8c" fontSize={11} tickLine={false} axisLine={false} />
                    <RTooltip cursor={{ fill: '#ffffff08' }} contentStyle={{ background: '#0f1522', border: '1px solid #222c3d', fontSize: 12 }} />
                    <Bar dataKey="ha" radius={[3, 3, 0, 0]}>
                      {result.patches.map((p) => (
                        <Cell key={p.n} fill={p.kind === 'cleared' ? '#ef4444' : '#facc15'} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {!result && !steps.length && (
        <div className={`${card} p-4 flex items-center gap-3 text-[13px] text-[#98a2b3]`}>
          <Satellite className="w-4 h-4 text-[#67e8f9]" />
          Tip: start with <b className="text-[#e6eaf0] font-medium">Khori Gaon</b> (already selected) and press Run. It is a documented demolition site, so you can see what a real result looks like.
        </div>
      )}
    </div>
  );
}

export default AreaScan;
