import React, { useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { GlobeFallback } from './GlobeFallback';
import { SEEDED_ZONES } from '../../api/seededData';
import { addGlobeLook, buildSentinel2, satelliteEnvironment, setFanSize, type GlobeLook } from './globeLook';

/**
 * Fixed Earth behind the whole landing page (Meridian-style).
 * Every section marked with data-orbit="<key>" has a globe pose; while scrolling, the globe glides
 * between poses (camera position + screen offset), so it moves from the bottom arc in the hero to the
 * left, to the right behind a card, down to Delhi's protected zones, and so on.
 */

type Pose = {
  lat: number;
  lng: number;
  alt: number;
  /** screen offset as a share of the viewport: +ox moves the globe left, +oy moves it down */
  ox: number;
  oy: number;
  /** gentle drift (0 = hold still, e.g. when showing Delhi) */
  spin: number;
  sat?: number;
  zones?: number;
};

export const POSES: Record<string, Pose> = {
  hero: { lat: 46, lng: 42, alt: 0.95, ox: 0, oy: 0.6, spin: 1 },
  left: { lat: 30, lng: 62, alt: 1.55, ox: 0.33, oy: -0.18, spin: 1 },
  sat: { lat: 22, lng: 79, alt: 1.3, ox: -0.25, oy: 0.04, spin: 0, sat: 1 },
  stats: { lat: 18, lng: 80, alt: 1.5, ox: -0.1, oy: 0.3, spin: 1 },
  zones: { lat: 28.47, lng: 77.17, alt: 0.16, ox: 0, oy: -0.3, spin: 0, zones: 1 },
  left2: { lat: 26, lng: 70, alt: 1.8, ox: 0.3, oy: 0.12, spin: 1 },
  right2: { lat: 24, lng: 84, alt: 1.6, ox: -0.3, oy: -0.05, spin: 1 },
  cta: { lat: 22, lng: 76, alt: 1.25, ox: 0.04, oy: 0.2, spin: 1 },
  end: { lat: 20, lng: 78, alt: 1.1, ox: 0, oy: 0.7, spin: 1 },
};

const SITE_BBOX: [number, number, number, number] = [77.1592218, 28.3610016, 77.1853582, 28.3839984];
const SAT_ALT = 786 / 6371; // Sentinel-2 orbit height relative to Earth's radius
const SAT_SCALE = 2.6;
const trackLng = (lat: number) => 77.2 + (28.4 - lat) * 0.22;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function clockwise(ring: [number, number][]): [number, number][] {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return area > 0 ? [...ring].reverse() : ring;
}

export function canUseGlobe(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  if (window.innerWidth < 768) return false;
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch {
    return false;
  }
}

/** Reads the section layout and returns the blended pose for the current scroll position. */
function currentPose(): { pose: Pose; key: string } {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-orbit]'));
  const vh = window.innerHeight;
  if (!els.length) return { pose: POSES.hero, key: 'hero' };
  let i = 0;
  els.forEach((el, k) => {
    if (el.getBoundingClientRect().top <= vh * 0.4) i = k;
  });
  const a = POSES[els[i].dataset.orbit || 'hero'] || POSES.hero;
  const nextEl = els[i + 1];
  if (!nextEl) return { pose: a, key: els[i].dataset.orbit || 'hero' };
  const b = POSES[nextEl.dataset.orbit || 'hero'] || POSES.hero;
  const t = smooth(clamp((vh * 0.9 - nextEl.getBoundingClientRect().top) / (vh * 0.5)));
  const pose: Pose = {
    lat: lerp(a.lat, b.lat, t),
    lng: lerp(a.lng, b.lng, t),
    alt: Math.exp(lerp(Math.log(a.alt), Math.log(b.alt), t)),
    ox: lerp(a.ox, b.ox, t),
    oy: lerp(a.oy, b.oy, t),
    spin: lerp(a.spin, b.spin, t),
    sat: lerp(a.sat || 0, b.sat || 0, t),
    zones: lerp(a.zones || 0, b.zones || 0, t),
  };
  return { pose, key: t < 0.5 ? els[i].dataset.orbit || 'hero' : nextEl.dataset.orbit || 'hero' };
}

export function OrbitBackdrop() {
  const [enabled] = useState(canUseGlobe);
  const [tilesOk, setTilesOk] = useState(true);
  const [stage, setStage] = useState('hero');
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const globeRef = useRef<any>(null);
  const satRef = useRef<THREE.Object3D | null>(null);
  const lookRef = useRef<GlobeLook | null>(null);
  const lightRef = useRef<THREE.DirectionalLight | null>(null);
  const stageRef = useRef('hero');

  useEffect(() => {
    if (!enabled) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = window.setTimeout(() => setTilesOk(false), 5000);
    img.onload = () => window.clearTimeout(timer);
    img.onerror = () => {
      window.clearTimeout(timer);
      setTilesOk(false);
    };
    img.src = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/1/0/1';
    return () => window.clearTimeout(timer);
  }, [enabled]);

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // animation loop
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let running = true;
    const start = performance.now();
    let cur: Pose | null = null;
    let last = start;
    const tick = (now: number) => {
      if (!running) return;
      const g = globeRef.current;
      if (g) {
        const ts = (now - start) / 1000;
        const { pose: target, key } = currentPose();
        // ease towards the target pose so scrolling glides instead of jumping
        const k = 1 - Math.exp(-(now - last) / 220);
        last = now;
        if (!cur) cur = { ...target };
        else {
          cur = {
            lat: lerp(cur.lat, target.lat, k),
            lng: lerp(cur.lng, target.lng, k),
            alt: Math.exp(lerp(Math.log(cur.alt), Math.log(target.alt), k)),
            ox: lerp(cur.ox, target.ox, k),
            oy: lerp(cur.oy, target.oy, k),
            spin: lerp(cur.spin, target.spin, k),
            sat: lerp(cur.sat || 0, target.sat || 0, k),
            zones: lerp(cur.zones || 0, target.zones || 0, k),
          };
        }
        const pose = cur;
        if (key !== stageRef.current) {
          stageRef.current = key;
          setStage(key);
        }
        const drift = 22 * Math.sin(ts * 0.045) * pose.spin;
        g.pointOfView({ lat: pose.lat, lng: pose.lng - drift, altitude: pose.alt }, 0);
        const cam = g.camera() as THREE.PerspectiveCamera;
        const w = window.innerWidth;
        const h = window.innerHeight;
        cam.setViewOffset(w, h, pose.ox * w, -pose.oy * h, w, h);
        lookRef.current?.update(cam, pose.alt, ts);

        const sat = satRef.current;
        const light = lightRef.current;
        const show = (pose.sat || 0) > 0.5;
        if (sat) sat.visible = show;
        if (light) light.visible = show;
        if (sat && show) {
          const lat = -6 + ((ts % 18) / 18) * 52; // one pass across India every 18 s
          const c = g.getCoords(lat, trackLng(lat), SAT_ALT);
          const ahead = g.getCoords(lat + 0.5, trackLng(lat + 0.5), SAT_ALT);
          sat.position.set(c.x, c.y, c.z);
          sat.up.set(ahead.x - c.x, ahead.y - c.y, ahead.z - c.z).normalize();
          sat.lookAt(0, 0, 0);
          sat.rotateY(0.6);
          sat.rotateX(-0.35);
          if (light) {
            light.position.copy(sat.position).add(cam.position.clone().sub(sat.position).normalize().multiplyScalar(40)).add(new THREE.Vector3(0, 30, 0));
            light.target.position.copy(sat.position);
            light.target.updateMatrixWorld();
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onVis = () => {
      const g = globeRef.current;
      if (!g) return;
      if (document.hidden) g.pauseAnimation?.();
      else g.resumeAnimation?.();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [enabled]);

  useEffect(
    () => () => {
      try {
        lookRef.current?.dispose();
        const r = globeRef.current?.renderer?.();
        r?.dispose();
        r?.forceContextLoss?.();
      } catch {
        /* ignore */
      }
    },
    []
  );

  const onGlobeReady = () => {
    const g = globeRef.current;
    if (!g) return;
    try {
      const controls = g.controls();
      controls.enabled = false;
      controls.autoRotate = false;
      g.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      lookRef.current = addGlobeLook(g.scene());
      const sat = buildSentinel2();
      sat.scale.setScalar(SAT_SCALE);
      setFanSize(sat, (SAT_ALT * 100) / SAT_SCALE - 2.2, 145 / 63.71 / SAT_SCALE);
      satelliteEnvironment(g.renderer(), sat);
      sat.visible = false;
      g.scene().add(sat);
      satRef.current = sat;
      const light = new THREE.DirectionalLight(0xfff4e0, 2.4);
      light.visible = false;
      g.scene().add(light, light.target);
      lightRef.current = light;
    } catch (e) {
      console.warn('Globe setup warning', e);
    }
  };

  const zoneFeatures = useMemo(
    () =>
      SEEDED_ZONES.map((z) => {
        const f = JSON.parse(z.geojson);
        const coords = (f.geometry.coordinates as [number, number][][]).map(clockwise);
        return { type: 'Feature', geometry: { type: 'Polygon', coordinates: coords }, properties: { id: z.id, name: z.name } };
      }),
    []
  );
  const siteFeature = useMemo(
    () => ({
      type: 'Feature',
      properties: { id: 'site' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          clockwise([
            [SITE_BBOX[0], SITE_BBOX[1]],
            [SITE_BBOX[2], SITE_BBOX[1]],
            [SITE_BBOX[2], SITE_BBOX[3]],
            [SITE_BBOX[0], SITE_BBOX[3]],
            [SITE_BBOX[0], SITE_BBOX[1]],
          ]),
        ],
      },
    }),
    []
  );
  const trackPath = useMemo(() => {
    const pts: [number, number][] = [];
    for (let lat = -10; lat <= 50; lat += 1) pts.push([lat, trackLng(lat)]);
    return [{ pts }];
  }, []);
  const swath = useMemo(() => {
    const half = 1.35;
    const left: [number, number][] = [];
    const right: [number, number][] = [];
    for (let lat = -10; lat <= 50; lat += 2) {
      left.push([trackLng(lat) - half, lat]);
      right.push([trackLng(lat) + half, lat]);
    }
    return { type: 'Feature', properties: { id: 'swath' }, geometry: { type: 'Polygon', coordinates: [clockwise([...left, ...right.reverse(), left[0]])] } };
  }, []);

  const polygons = useMemo(() => {
    if (stage === 'sat') return [swath];
    if (stage === 'zones') return [...zoneFeatures, siteFeature];
    return [];
  }, [stage, swath, zoneFeatures, siteFeature]);

  const labels = useMemo(
    () =>
      stage === 'zones'
        ? SEEDED_ZONES.filter((z) => z.id <= 105).map((z) => {
            const ring = JSON.parse(z.geojson).geometry.coordinates[0] as [number, number][];
            return {
              lat: ring.reduce((s, c) => s + c[1], 0) / ring.length,
              lng: ring.reduce((s, c) => s + c[0], 0) / ring.length,
              text: `Z-${z.id} ${z.name.split(' ').slice(0, 2).join(' ')}`,
            };
          })
        : [],
    [stage]
  );

  if (!enabled) {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none flex items-end justify-center overflow-hidden opacity-60">
        <div className="translate-y-1/3">
          <GlobeFallback size={760} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
      <Globe
        ref={globeRef}
        width={size.w}
        height={size.h}
        backgroundColor="rgba(0,0,0,0)"
        globeTileEngineUrl={
          tilesOk
            ? (x: number, y: number, l: number) =>
                `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${l}/${y}/${x}`
            : null
        }
        globeImageUrl={tilesOk ? undefined : '/textures/earth-blue-marble.jpg'}
        showAtmosphere
        atmosphereColor="#7fb2ff"
        atmosphereAltitude={0.17}
        enablePointerInteraction={false}
        polygonsData={polygons}
        polygonCapColor={(d: any) =>
          d.properties?.id === 'swath' ? 'rgba(147,197,253,0.16)' : d.properties?.id === 'site' ? 'rgba(239,68,68,0.14)' : 'rgba(250,204,21,0.14)'
        }
        polygonSideColor={() => 'rgba(0,0,0,0)'}
        polygonStrokeColor={(d: any) => (d.properties?.id === 'swath' ? '#93c5fd' : d.properties?.id === 'site' ? '#ef4444' : '#facc15')}
        polygonAltitude={(d: any) => (d.properties?.id === 'swath' ? 0.004 : 0.0006)}
        polygonsTransitionDuration={0}
        pathsData={stage === 'sat' ? trackPath : []}
        pathPoints={(d: any) => d.pts}
        pathPointLat={(pt: any) => pt[0]}
        pathPointLng={(pt: any) => pt[1]}
        pathPointAlt={() => 0.006}
        pathColor={() => ['rgba(147,197,253,0.9)', 'rgba(147,197,253,0.2)']}
        pathStroke={1.2}
        pathDashLength={0.06}
        pathDashGap={0.02}
        pathDashAnimateTime={4000}
        pathTransitionDuration={0}
        htmlElementsData={labels}
        htmlLat={(d: any) => d.lat}
        htmlLng={(d: any) => d.lng}
        htmlAltitude={0.001}
        htmlTransitionDuration={0}
        htmlElement={(d: any) => {
          const el = document.createElement('div');
          el.style.cssText =
            'transform:translate(-50%,-100%);pointer-events:none;font:600 11px Inter,system-ui,sans-serif;color:#f5f5f0;background:rgba(8,11,20,0.85);border:1px solid rgba(255,255,255,0.12);padding:2px 6px;border-radius:6px;white-space:nowrap;';
          el.textContent = d.text;
          return el;
        }}
        onGlobeReady={onGlobeReady}
      />
      <div className="absolute bottom-2 left-3 text-[10px] text-[#7d8496]">
        {tilesOk ? 'Imagery: Esri World Imagery' : 'Imagery: NASA Blue Marble'}
      </div>
    </div>
  );
}

export default OrbitBackdrop;
