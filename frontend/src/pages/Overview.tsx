import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAlerts } from '../hooks/useAlerts';
import { AlertAreaChart } from '../components/charts/AlertAreaChart';
import { LoadingState } from '../components/ui/StatusStates';
import { getClassColor, severityColor } from '../utils/riskColors';
import { formatTimeAgo } from '../utils/formatters';
import { getLedgerChain, verifyChain, getChainAnchor } from '../engine/ledger';
import { SEEDED_ZONES } from '../api/seededData';
import { totalEncroachedAreaM2, trend30d } from '../engine/selectors';
import type { Alert } from '../types/alert.types';
import { AlertTriangle, Leaf, Map as MapIcon, ArrowRight, ChevronRight, Layers, Satellite, ShieldCheck } from 'lucide-react';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer';
const thumb = (lng: number, lat: number, d = 0.006, px = 160) =>
  `${ESRI}/export?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&bboxSR=4326&imageSR=4326&size=${px},${px}&format=jpg&f=image`;

const card = 'rounded-xl border border-[#1e2738] bg-[#0f1522]';
const zoneFeatures = SEEDED_ZONES.map((z) => ({ ...JSON.parse(z.geojson), properties: { id: z.id, name: z.name, risk: z.risk_level } }));

function zoneCenter(geojson: string): [number, number] {
  const ring = JSON.parse(geojson).geometry.coordinates[0] as [number, number][];
  return [ring.reduce((s, c) => s + c[0], 0) / ring.length, ring.reduce((s, c) => s + c[1], 0) / ring.length];
}
const shortZone = (name?: string) => (name || '').replace(/ Sector.*| Zone.*| Wildlife Sanctuary| Sacred Grove| Forest Reserve/, '');

function FitZones() {
  const map = useMap();
  useEffect(() => {
    // frame the Delhi core zones; the outer zones are a short pan away
    const core = zoneFeatures.filter((f: any) => f.properties.id <= 105);
    const b = L.geoJSON({ type: 'FeatureCollection', features: core } as any).getBounds();
    map.fitBounds(b, { padding: [30, 30] });
  }, [map]);
  return null;
}

function OverviewMap({ alerts }: { alerts: Alert[] }) {
  const navigate = useNavigate();
  const [layers, setLayers] = useState({ zones: true, alerts: true, labels: true });
  const toggles: { key: keyof typeof layers; label: string; icon: any }[] = [
    { key: 'zones', label: 'Protected zones', icon: MapIcon },
    { key: 'alerts', label: 'Detected changes', icon: AlertTriangle },
    { key: 'labels', label: 'Zone names', icon: Layers },
  ];
  const legend = [
    { label: 'Deforestation', color: getClassColor('Deforestation') },
    { label: 'Unauthorized construction', color: getClassColor('Unauthorized Construction') },
    { label: 'Mining', color: getClassColor('Mining') },
    { label: 'Land encroachment', color: getClassColor('Land Encroachment') },
  ];
  return (
    <div className={`${card} relative overflow-hidden h-[560px]`}>
      <MapContainer center={[28.5, 77.15]} zoom={10} zoomControl={false} attributionControl={false} className="w-full h-full overview-map" scrollWheelZoom>
        <TileLayer url={`${ESRI}/tile/{z}/{y}/{x}`} maxZoom={18} />
        <FitZones />
        {layers.zones && (
          <GeoJSON
            data={{ type: 'FeatureCollection', features: zoneFeatures } as any}
            style={() => ({ color: '#d9e2ec', weight: 1.2, opacity: 0.8, fillColor: '#facc15', fillOpacity: 0.04 })}
          />
        )}
        {layers.labels &&
          SEEDED_ZONES.filter((z) => z.id <= 105).map((z) => {
            const [lng, lat] = zoneCenter(z.geojson);
            return (
              <Marker
                key={z.id}
                position={[lat, lng]}
                interactive={false}
                icon={L.divIcon({
                  className: '',
                  html: `<span style="font:500 12px Inter,sans-serif;color:#eef2f7;text-shadow:0 1px 3px #000c;white-space:nowrap;transform:translate(-50%,-50%);display:inline-block">${shortZone(z.name)}</span>`,
                })}
              />
            );
          })}
        {layers.alerts &&
          alerts
            .filter((a) => a.lat && a.lng)
            .map((a) => (
              <CircleMarker
                key={a.id}
                center={[a.lat, a.lng]}
                radius={a.severity === 'CRITICAL' ? 7 : 5}
                pathOptions={{ color: '#0b1018', weight: 1, fillColor: getClassColor(a.class), fillOpacity: 0.95 }}
                eventHandlers={{ click: () => navigate('/alerts') }}
              >
                <Tooltip direction="top" offset={[0, -6]}>
                  <span className="text-xs">
                    #{a.id} {a.class} · {((a.area_m2 || 0) / 1e4).toFixed(2)} ha · {a.status}
                  </span>
                </Tooltip>
              </CircleMarker>
            ))}
      </MapContainer>

      <div className="absolute top-4 left-4 z-[500] w-52 rounded-lg border border-white/10 bg-[#0b1018]/85 backdrop-blur p-1.5">
        <div className="flex items-center gap-2.5 px-2.5 py-2 text-[13px] text-[#e6eaf0]">
          <Satellite className="w-4 h-4 text-[#98a2b3]" /> Satellite view
        </div>
        {toggles.map((t) => (
          <button
            key={t.key}
            onClick={() => setLayers((l) => ({ ...l, [t.key]: !l[t.key] }))}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] text-left hover:bg-white/5"
          >
            <t.icon className={`w-4 h-4 ${layers[t.key] ? 'text-[#e6eaf0]' : 'text-[#5d6778]'}`} />
            <span className={`flex-1 ${layers[t.key] ? 'text-[#e6eaf0]' : 'text-[#6f7a8c]'}`}>{t.label}</span>
            <span className={`w-7 h-4 rounded-full p-0.5 transition-colors ${layers[t.key] ? 'bg-[#facc15]/80' : 'bg-[#2a3446]'}`}>
              <span className={`block w-3 h-3 rounded-full bg-[#0b1018] transition-transform ${layers[t.key] ? 'translate-x-3' : ''}`} />
            </span>
          </button>
        ))}
      </div>

      <div className="absolute bottom-4 left-4 z-[500] rounded-lg border border-white/10 bg-[#0b1018]/85 backdrop-blur px-3.5 py-3 flex flex-col gap-1.5">
        {legend.map((l) => (
          <span key={l.label} className="flex items-center gap-2 text-[12px] text-[#c9d1dc]">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
      <span className="absolute bottom-2 right-3 z-[500] text-[10px] text-[#c9d1dc]/70">Imagery © Esri · zone outlines indicative</span>
    </div>
  );
}

export function Overview() {
  const { alerts, loading } = useAlerts();
  const [chainOk, setChainOk] = useState(true);
  const [blocks, setBlocks] = useState(0);

  useEffect(() => {
    let alive = true;
    getLedgerChain()
      .then((c) => {
        if (alive) setBlocks(c.length);
        return verifyChain(c, getChainAnchor());
      })
      .then((r) => alive && setChainOk(r.valid));
    return () => {
      alive = false;
    };
  }, [alerts.length]);

  const critical = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const areaHa = totalEncroachedAreaM2(alerts) / 1e4;
  const recent = useMemo(
    () => [...alerts].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 4),
    [alerts]
  );
  const byStatus = (s: string) => alerts.filter((a) => a.status === s).length;
  const topZones = useMemo(
    () =>
      [...SEEDED_ZONES]
        .map((z) => ({ z, n: alerts.filter((a) => a.zone_id === z.id).length }))
        .sort((a, b) => b.n - a.n)
        .slice(0, 3),
    [alerts]
  );

  if (loading && !alerts.length) return <LoadingState title="Loading…" message="Reading alerts and zones." />;

  return (
    <div className="max-w-[1500px] mx-auto flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[#eef2f7]">Overview</h1>
          <p className="text-sm text-[#98a2b3] mt-1">
            Land changes detected from satellite images across the protected zones of Delhi NCR.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NavLink to="/scan" className="px-4 py-2 rounded-lg border border-[#222c3d] bg-[#111826] text-[13px] text-[#e6eaf0] hover:border-[#2f3a4d]">
            Run scan
          </NavLink>
          <NavLink to="/alerts" className="px-4 py-2 rounded-lg bg-[#facc15] text-[13px] font-medium text-[#0b1018] hover:bg-[#fde047]">
            Review alerts
          </NavLink>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-8">
          <OverviewMap alerts={alerts} />
        </div>

        <div className="xl:col-span-4 flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: AlertTriangle, tint: '#f87171', value: alerts.length, label: 'Total alerts', sub: `${critical} critical`, subCls: 'text-[#f87171]' },
              { icon: Leaf, tint: '#4ade80', value: <>{areaHa.toFixed(1)}<span className="text-[13px] font-normal text-[#98a2b3] ml-1">ha</span></>, label: 'Area affected', sub: 'inside zones', subCls: 'text-[#6f7a8c]' },
              { icon: MapIcon, tint: '#7dd3fc', value: SEEDED_ZONES.length, label: 'Protected zones', sub: 'Delhi NCR', subCls: 'text-[#6f7a8c]' },
            ].map((k) => (
              <div key={k.label} className={`${card} p-4`}>
                <k.icon className="w-5 h-5" style={{ color: k.tint }} />
                <p className="mt-3 text-[20px] font-semibold text-[#eef2f7] leading-none whitespace-nowrap">{k.value}</p>
                <p className="mt-1.5 text-[12px] text-[#98a2b3]">{k.label}</p>
                <p className={`mt-1 text-[11px] ${k.subCls}`}>{k.sub}</p>
              </div>
            ))}
          </div>

          <div className={`${card} p-4`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[15px] font-medium text-[#eef2f7]">Recent alerts</h3>
              <NavLink to="/alerts" className="text-[13px] text-[#facc15] flex items-center gap-1 hover:underline">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </NavLink>
            </div>
            <ul className="flex flex-col divide-y divide-[#1b2331]">
              {recent.map((a) => {
                const sev = severityColor[a.severity] || '#94a3b8';
                return (
                  <li key={a.id}>
                    <NavLink to="/alerts" className="flex items-center gap-3 py-2.5 group">
                      <img
                        src={thumb(a.lng, a.lat)}
                        alt=""
                        loading="lazy"
                        onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
                        className="w-14 h-14 rounded-md object-cover bg-[#172031] border border-[#1e2738] flex-shrink-0"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sev }} />
                          <span className="text-[13px] text-[#e6eaf0] truncate">
                            {a.class} · {shortZone(a.zone_name)}
                          </span>
                        </span>
                        <span className="block text-[12px] text-[#7d8798] mt-0.5">
                          {((a.area_m2 || 0) / 1e4).toFixed(2)} ha · {a.status} · {formatTimeAgo(a.created_at)}
                        </span>
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-md text-[11px] capitalize border"
                        style={{ color: sev, borderColor: `${sev}55`, background: `${sev}14` }}
                      >
                        {a.severity.toLowerCase()}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#5d6778] group-hover:text-[#98a2b3]" />
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className={`${card} p-4 flex-1`}>
            <h3 className="text-[15px] font-medium text-[#eef2f7] mb-1">Alerts over the last 30 days</h3>
            <AlertAreaChart data={trend30d(alerts)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className={`xl:col-span-7 ${card} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-medium text-[#eef2f7]">Zones with the most alerts</h3>
            <NavLink to="/map" className="text-[13px] text-[#facc15] flex items-center gap-1 hover:underline">
              View map <ArrowRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topZones.map(({ z, n }) => {
              const [lng, lat] = zoneCenter(z.geojson);
              return (
                <div key={z.id} className="flex gap-3 p-2 rounded-lg border border-[#1b2331] bg-[#0c111c]">
                  <img src={thumb(lng, lat, 0.03, 200)} alt="" loading="lazy" onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')} className="w-20 h-20 rounded-md object-cover bg-[#172031]" />
                  <span className="min-w-0 py-0.5">
                    <span className="block text-[13px] text-[#e6eaf0] leading-snug">{shortZone(z.name)}</span>
                    <span className="block text-[12px] text-[#7d8798] mt-1">{z.code} · {(z.area_m2 / 1e4).toLocaleString(undefined, { maximumFractionDigits: 0 })} ha</span>
                    <span className="block text-[12px] text-[#98a2b3] mt-1">{n} alerts</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`xl:col-span-5 ${card} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-medium text-[#eef2f7]">Evidence record</h3>
            <NavLink to="/ledger" className="text-[13px] text-[#facc15] flex items-center gap-1 hover:underline">
              View ledger <ArrowRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1 relative rounded-lg overflow-hidden border border-[#1b2331] h-20">
              <img src="/real/cases/khori-gaon/t0_rgb.png" alt="Khori Gaon 2021" className="absolute inset-0 w-full h-full object-cover" style={{ clipPath: 'inset(0 50% 0 0)' }} />
              <img src="/real/cases/khori-gaon/t1_rgb.png" alt="Khori Gaon 2022" className="absolute inset-0 w-full h-full object-cover" style={{ clipPath: 'inset(0 0 0 50%)' }} />
              <span className="absolute inset-y-0 left-1/2 w-px bg-white/70" />
              <span className="absolute bottom-1 left-1 text-[10px] text-white/90 bg-black/50 px-1 rounded">2021 | 2022</span>
            </div>
            <div className="col-span-2 flex flex-col justify-center gap-1.5 text-[13px]">
              <span className="flex items-center gap-2 text-[#e6eaf0]">
                <ShieldCheck className={`w-4 h-4 ${chainOk ? 'text-[#4ade80]' : 'text-[#f87171]'}`} />
                {chainOk ? `Chain intact · ${blocks} blocks` : 'Chain check failed'}
              </span>
              <span className="text-[12px] text-[#7d8798]">Every action is a signed block; the database copy refuses edits.</span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
            {[
              { label: 'Verified', n: byStatus('Verified'), dot: '#4ade80' },
              { label: 'New, to review', n: byStatus('New'), dot: '#facc15' },
              { label: 'Notice issued', n: byStatus('Notice Issued') + byStatus('Signed & Served'), dot: '#7dd3fc' },
            ].map((s) => (
              <span key={s.label} className="flex items-center gap-2 px-2.5 py-2 rounded-md border border-[#1b2331] bg-[#0c111c] text-[#c9d1dc]">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
                <span className="flex-1">{s.label}</span>
                <span className="text-[#eef2f7] font-medium">{s.n}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Overview;
