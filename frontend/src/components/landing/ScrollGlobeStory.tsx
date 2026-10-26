import React, { useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { GlobeFallback } from './GlobeFallback';
import { SEEDED_ZONES } from '../../api/seededData';
import { addGlobeLook, buildSentinel2, satelliteEnvironment, setFanSize, type GlobeLook } from './globeLook';

// Sentinel-2 orbits about 786 km up: 786 / 6371 km Earth radius.
const SAT_ALT = 786 / 6371;
const SAT_SCALE = 2.6;

/**
 * Scroll-driven landing story.
 * The globe stays pinned while the page scrolls; scroll position drives the camera:
 *   world -> India -> a Sentinel-2 pass over Delhi -> the 8 protected zones -> the Mangar Bani site.
 * Imagery: Esri World Imagery tiles on the globe surface.
 */

// Real Mangar Bani site crop used for the real Sentinel-2 example (Z-102).
const SITE_BBOX: [number, number, number, number] = [77.1592218, 28.3610016, 77.1853582, 28.3839984];

type Pov = { lat: number; lng: number; altitude: number };

// Camera keyframes along scroll progress (0..1).
const KEYS: { p: number; pov: Pov }[] = [
  { p: 0.0, pov: { lat: 46, lng: 42, altitude: 0.95 } },
  { p: 0.18, pov: { lat: 22, lng: 78, altitude: 2.3 } },
  { p: 0.36, pov: { lat: 24, lng: 77.5, altitude: 1.5 } },
  { p: 0.52, pov: { lat: 27.5, lng: 77.3, altitude: 0.9 } },
  { p: 0.7, pov: { lat: 28.5, lng: 77.15, altitude: 0.035 } },
  { p: 0.9, pov: { lat: 28.3725, lng: 77.1723, altitude: 0.0035 } },
  { p: 1.0, pov: { lat: 28.3725, lng: 77.1723, altitude: 0.0035 } },
];

const CHAPTERS = [
  {
    from: 0.1,
    to: 0.33,
    kicker: 'The data',
    title: 'Free images of all land, every five days',
    body: "The European Space Agency's Sentinel-2 satellites photograph every piece of land on Earth at 10-metre detail. Anyone can download the images.",
  },
  {
    from: 0.33,
    to: 0.55,
    kicker: 'The satellite',
    title: 'A Sentinel-2 pass over Delhi',
    body: 'About 786 km up, the satellite records a 290 km wide strip as it moves. Sentinel-1 radar works the same way and can see through cloud.',
  },
  {
    from: 0.55,
    to: 0.78,
    kicker: 'The boundaries',
    title: '8 protected zones in Delhi NCR',
    body: 'The Ridge forest, Yamuna floodplain, Asola Bhatti, Mangar Bani and others. SentinelEye checks every change against these boundaries.',
  },
  {
    from: 0.78,
    to: 1.01,
    kicker: 'The site',
    title: 'Mangar Bani sacred grove',
    body: 'We compare the same 2.6 km square in March 2022 and April 2026. Scroll down to see the real images.',
  },
];

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// Deterministic starfield as layered radial gradients (no images, no runtime cost).
const STARS = (() => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out: string[] = [];
  for (let i = 0; i < 140; i++) {
    const x = (rnd() * 100).toFixed(2);
    const y = (rnd() * 100).toFixed(2);
    const r = rnd() < 0.85 ? 0.6 : 1.1;
    const a = (0.35 + rnd() * 0.6).toFixed(2);
    out.push(`radial-gradient(${r}px ${r}px at ${x}% ${y}%, rgba(255,255,255,${a}), transparent 100%)`);
  }
  return out.join(',');
})();

// The globe treats clockwise rings as the inside of a polygon; a counter-clockwise ring
// would fill the rest of the planet instead. Normalise every outer ring to clockwise.
function clockwise(ring: [number, number][]): [number, number][] {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return area > 0 ? [...ring].reverse() : ring;
}
const smooth = (t: number) => t * t * (3 - 2 * t);

function povAt(p: number): Pov {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = smooth(clamp((p - a.p) / (b.p - a.p)));
  // altitude in log space so zooming feels even
  const alt = Math.exp(Math.log(a.pov.altitude) + (Math.log(b.pov.altitude) - Math.log(a.pov.altitude)) * t);
  return {
    lat: a.pov.lat + (b.pov.lat - a.pov.lat) * t,
    lng: a.pov.lng + (b.pov.lng - a.pov.lng) * t,
    altitude: alt,
  };
}

// Ground track crossing Delhi (sun-synchronous orbits run roughly north-south).
const trackLng = (lat: number) => 77.2 + (28.4 - lat) * 0.22;
const SAT_FROM = 0.3;
const SAT_TO = 0.56;
const satLatAt = (p: number) => -8 + 56 * clamp((p - SAT_FROM) / (SAT_TO - SAT_FROM));

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

export function ScrollGlobeStory({ children }: { children: React.ReactNode }) {
  const [enabled] = useState(canUseGlobe);
  // Live satellite tiles when reachable; otherwise the bundled Blue Marble texture.
  const [tilesOk, setTilesOk] = useState(true);
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
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<any>(null);
  const satRef = useRef<THREE.Object3D | null>(null);
  const lookRef = useRef<GlobeLook | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const [size, setSize] = useState({ w: typeof window !== 'undefined' ? window.innerWidth : 1280, h: typeof window !== 'undefined' ? window.innerHeight : 800 });

  // Coarse stages so data layers only re-render when the story moves to a new chapter.
  const stage = progress < 0.3 ? 0 : progress < 0.56 ? 1 : progress < 0.78 ? 2 : 3;

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Scroll -> progress
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = sectionRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const p = clamp(-r.top / Math.max(1, r.height - window.innerHeight));
        progressRef.current = p;
        setProgress((prev) => (Math.abs(prev - p) > 0.004 ? p : prev));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  // Animation loop: camera from scroll (+ gentle drift at the very top), satellite position.
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let running = true;
    const start = performance.now();
    const tick = (now: number) => {
      if (!running) return;
      const g = globeRef.current;
      if (g) {
        const p = progressRef.current;
        const pov = povAt(p);
        const drift = ((now - start) / 1000) * 2.5 * (1 - smooth(clamp(p / 0.12)));
        g.pointOfView({ lat: pov.lat, lng: pov.lng - drift, altitude: pov.altitude }, 0);

        lookRef.current?.update(g.camera(), pov.altitude, (now - start) / 1000);
        // Earth rises from the bottom edge: shift the projection (no clipping, unlike a CSS transform)
        const cam = g.camera() as THREE.PerspectiveCamera;
        const rise = smooth(clamp(p / 0.14));
        const w = window.innerWidth;
        const h = window.innerHeight;
        cam.setViewOffset(w, h, 0, -(1 - rise) * 0.55 * h, w, h);

        const sat = satRef.current;
        if (sat) {
          const visible = p > SAT_FROM - 0.02 && p < SAT_TO + 0.06;
          sat.visible = visible;
          const light = sunLightRef.current;
          if (light) light.visible = visible;
          if (visible) {
            const lat = satLatAt(p);
            const c = g.getCoords(lat, trackLng(lat), SAT_ALT);
            const ahead = g.getCoords(lat + 0.5, trackLng(lat + 0.5), SAT_ALT);
            sat.position.set(c.x, c.y, c.z);
            sat.up.set(ahead.x - c.x, ahead.y - c.y, ahead.z - c.z).normalize();
            sat.lookAt(0, 0, 0); // +z (instrument) points at the ground, +y along the track
            sat.rotateY(0.6); // bank towards the viewer so the body and wing read in 3D
            sat.rotateX(-0.35);
            if (light) {
              const cam = g.camera() as THREE.Camera;
              light.position.copy(sat.position).add(cam.position.clone().sub(sat.position).normalize().multiplyScalar(40)).add(new THREE.Vector3(0, 30, 0));
              light.target.position.copy(sat.position);
              light.target.updateMatrixWorld();
            }
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // pause rendering when the story is off screen
    const el = sectionRef.current;
    let io: IntersectionObserver | null = null;
    if (el && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(([e]) => {
        const g = globeRef.current;
        if (!g) return;
        if (e.isIntersecting) g.resumeAnimation?.();
        else g.pauseAnimation?.();
      });
      io.observe(el);
    }
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io?.disconnect();
    };
  }, [enabled]);

  const onGlobeReady = () => {
    const g = globeRef.current;
    if (!g) return;
    try {
      const controls = g.controls();
      controls.enabled = false; // scroll drives the camera
      controls.autoRotate = false;
      g.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      lookRef.current = addGlobeLook(g.scene());
      const sat = buildSentinel2();
      sat.scale.setScalar(SAT_SCALE);
      // fan from the instrument down to the ground, 290 km wide (145 km each side, 1 unit = 63.71 km)
      setFanSize(sat, (SAT_ALT * 100) / SAT_SCALE - 2.2, 145 / 63.71 / SAT_SCALE);
      satelliteEnvironment(g.renderer(), sat);
      sat.visible = false;
      g.scene().add(sat);
      satRef.current = sat;
      const light = new THREE.DirectionalLight(0xfff4e0, 2.4);
      light.visible = false;
      g.scene().add(light, light.target);
      sunLightRef.current = light;
    } catch (e) {
      console.warn('Globe setup warning', e);
    }
  };

  useEffect(() => {
    return () => {
      try {
        const r = globeRef.current?.renderer?.();
        lookRef.current?.dispose();
        r?.dispose();
        r?.forceContextLoss?.();
      } catch {
        /* ignore */
      }
    };
  }, []);

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
      properties: { id: 'site', name: 'Real Sentinel-2 site' },
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

  // Ground track + 290 km swath while the satellite passes.
  const trackPath = useMemo(() => {
    const pts: [number, number][] = [];
    for (let lat = -10; lat <= 50; lat += 1) pts.push([lat, trackLng(lat)]);
    return [{ pts }];
  }, []);
  const swath = useMemo(() => {
    const half = 1.35; // ~145 km each side at Delhi's latitude
    const left: [number, number][] = [];
    const right: [number, number][] = [];
    for (let lat = -10; lat <= 50; lat += 2) {
      left.push([trackLng(lat) - half, lat]);
      right.push([trackLng(lat) + half, lat]);
    }
    return {
      type: 'Feature',
      properties: { id: 'swath' },
      geometry: { type: 'Polygon', coordinates: [clockwise([...left, ...right.reverse(), left[0]])] },
    };
  }, []);

  const polygons = useMemo(() => {
    if (stage === 1) return [swath];
    if (stage === 2) return zoneFeatures;
    if (stage === 3) return [...zoneFeatures, siteFeature];
    return [];
  }, [stage, swath, zoneFeatures, siteFeature]);

  const zoomedIn = progress > 0.69;
  const labels = useMemo(() => {
    if (stage === 2 && zoomedIn) {
      return SEEDED_ZONES.filter((z) => z.id <= 105).map((z) => {
        const ring = JSON.parse(z.geojson).geometry.coordinates[0] as [number, number][];
        const lng = ring.reduce((s, c) => s + c[0], 0) / ring.length;
        const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
        return { lat, lng, text: `Z-${z.id} ${z.name.split(' ').slice(0, 2).join(' ')}` };
      });
    }
    if (stage === 3) return [{ lat: SITE_BBOX[3] + 0.002, lng: SITE_BBOX[0], text: 'Real Sentinel-2 site · 2.6 km' }];
    return [];
  }, [stage, zoomedIn]);

  if (!enabled) {
    return (
      <section className="relative w-full min-h-screen overflow-hidden border-b border-[#242424]">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60">
          <GlobeFallback size={720} />
        </div>
        <div className="relative z-10 w-full min-h-screen flex flex-col justify-between px-6 sm:px-10 lg:px-14 py-6">
          {children}
        </div>
      </section>
    );
  }

  const heroOpacity = 1 - smooth(clamp((progress - 0.04) / 0.08));

  return (
    <section ref={sectionRef} className="relative w-full border-b border-[#242424]" style={{ height: '520vh' }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#050505]">
        {/* starfield */}
        <div
          className="absolute inset-0 pointer-events-none opacity-70"
          style={{ backgroundImage: STARS, backgroundSize: '100% 100%' }}
        />
        {/* faint vertical guides */}
        <div className="absolute inset-0 pointer-events-none">
          {[0.29, 0.5, 0.71].map((x) => (
            <span key={x} className="absolute top-0 bottom-0 w-px bg-white/[0.04]" style={{ left: `${x * 100}%` }} />
          ))}
        </div>
        <div
          className="absolute inset-0"
          style={{
            transform: 'none',
            transformOrigin: '50% 50%',
          }}
        >
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
              d.properties?.id === 'swath'
                ? 'rgba(147,197,253,0.16)'
                : d.properties?.id === 'site'
                ? 'rgba(239,68,68,0.12)'
                : 'rgba(250, 204, 21,0.14)'
            }
            polygonSideColor={() => 'rgba(0,0,0,0)'}
            polygonStrokeColor={(d: any) =>
              d.properties?.id === 'swath' ? '#93c5fd' : d.properties?.id === 'site' ? '#ef4444' : '#facc15'
            }
            polygonAltitude={(d: any) => (d.properties?.id === 'swath' ? 0.004 : 0.0006)}
            polygonsTransitionDuration={0}
            pathsData={stage === 1 ? trackPath : []}
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
                'transform:translate(-50%,-100%);pointer-events:none;font:600 11px Inter,system-ui,sans-serif;color:#f5f5f0;background:rgba(11,15,14,0.85);border:1px solid #2e2e2e;padding:2px 6px;border-radius:4px;white-space:nowrap;';
              el.textContent = d.text;
              return el;
            }}
            onGlobeReady={onGlobeReady}
          />
        </div>

        {/* legibility: soft top fade for the hero, left fade for chapters */}
        <div
          className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#050505] via-[#050505]/40 to-transparent"
          style={{ opacity: heroOpacity * 0.9 }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-[55%] pointer-events-none bg-gradient-to-t from-[#050505]/75 via-[#050505]/35 to-transparent"
          style={{ opacity: heroOpacity }}
        />
        <div
          className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#050505]/85 via-[#050505]/30 to-transparent"
          style={{ opacity: 1 - heroOpacity }}
        />

        {/* Chapter 0: hero (headline + sign in) */}
        <div
          className="absolute inset-0 z-20 flex flex-col justify-between px-6 sm:px-10 lg:px-14 py-6"
          style={{ opacity: heroOpacity, pointerEvents: heroOpacity > 0.5 ? 'auto' : 'none' }}
        >
          {children}
        </div>

        {/* Story chapters */}
        {CHAPTERS.map((c) => {
          const fadeIn = smooth(clamp((progress - c.from) / 0.05));
          const fadeOut = 1 - smooth(clamp((progress - (c.to - 0.05)) / 0.05));
          const o = Math.min(fadeIn, fadeOut);
          if (o <= 0.01) return null;
          return (
            <div
              key={c.title}
              className="absolute z-20 left-6 sm:left-10 lg:left-14 bottom-[18vh] max-w-md pointer-events-none"
              style={{ opacity: o, transform: `translateY(${(1 - o) * 16}px)` }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#facc15] mb-3">{c.kicker}</p>
              <h2 className="font-display font-light text-3xl sm:text-[2.6rem] text-[#f5f5f0] leading-[1.1]">{c.title}</h2>
              <p className="mt-4 text-[15px] text-[#cfcfc8] leading-relaxed">{c.body}</p>
            </div>
          );
        })}

        {/* progress rail */}
        <div className="absolute z-20 right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 pointer-events-none">
          {[0, ...CHAPTERS.map((c) => c.from)].map((f, i) => (
            <span
              key={i}
              className="w-1.5 h-6 rounded-full"
              style={{ background: progress + 0.001 >= f ? '#facc15' : 'rgba(255,255,255,0.18)' }}
            />
          ))}
        </div>

        <div className="absolute z-20 bottom-2 right-3 text-[10px] text-[#8f8f86] pointer-events-none">
          {tilesOk ? 'Imagery: Esri World Imagery' : 'Imagery: NASA Blue Marble'}
        </div>
      </div>
    </section>
  );
}

export default ScrollGlobeStory;
