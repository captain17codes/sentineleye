import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Globe from 'react-globe.gl';
import { GlobeFallback } from './GlobeFallback';

function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

function shouldFallback(): boolean {
  if (typeof window === 'undefined') return true;

  // 1. Reduced motion preference
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return true;
  }

  // 2. Mobile screen / user agent
  const isMobile =
    window.innerWidth < 768 ||
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    return true;
  }

  // 3. WebGL support
  if (!isWebGLAvailable()) {
    return true;
  }

  return false;
}

interface HeroGlobeProps {
  size?: number;
  className?: string;
}

export function HeroGlobe({ size: propSize, className }: HeroGlobeProps = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<any>(null);

  const [useFallback, setUseFallback] = useState<boolean>(() => shouldFallback());
  const [textureError, setTextureError] = useState<boolean>(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: propSize || 750,
    height: propSize || 750,
  });

  // Pre-validate texture availability
  useEffect(() => {
    if (useFallback) return;

    const img = new Image();
    img.src = '/textures/earth-blue-marble.jpg';
    img.onload = () => {
      // Texture is valid and ready locally
    };
    img.onerror = () => {
      setTextureError(true);
    };
  }, [useFallback]);

  // Track container dimensions with ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      if (propSize) {
        setDimensions({ width: propSize, height: propSize });
        return;
      }
      const rect = container.getBoundingClientRect();
      const rawSize = Math.min(rect.width || 750, 900);
      const size = Math.max(300, rawSize);
      setDimensions({ width: size, height: size });
    };

    updateSize();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => updateSize());
      ro.observe(container);
    }

    return () => {
      if (ro && container) ro.unobserve(container);
    };
  }, []);

  // Configure Globe controls, pixel ratio, and POV
  const handleGlobeReady = useCallback(() => {
    if (!globeRef.current) return;

    try {
      // Starting point of view centered over India (NCT of Delhi region)
      globeRef.current.pointOfView({ lat: 20.59, lng: 78.96, altitude: 2.2 }, 0);

      // Orbit controls: auto-rotate ~0.4, no zoom, drag only rotates
      const controls = globeRef.current.controls();
      if (controls) {
        controls.enableZoom = false;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.4;
      }

      // Cap pixel ratio at 1.5 for performance
      const renderer = globeRef.current.renderer();
      if (renderer) {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      }
    } catch (e) {
      console.warn('Globe setup encountered warning:', e);
    }
  }, []);

  // Performance: Pause when tab is hidden or hero is off-screen
  useEffect(() => {
    if (useFallback || textureError) return;

    const handleVisibility = () => {
      if (!globeRef.current) return;
      const isHidden = document.hidden;
      const controls = globeRef.current.controls();
      if (controls) {
        controls.autoRotate = !isHidden;
      }
      if (isHidden) {
        globeRef.current.pauseAnimation?.();
      } else {
        globeRef.current.resumeAnimation?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    const container = containerRef.current;
    let observer: IntersectionObserver | null = null;

    if (container && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!globeRef.current) return;
          const isVisible = entry.isIntersecting && !document.hidden;
          const controls = globeRef.current.controls();
          if (controls) {
            controls.autoRotate = isVisible;
          }
          if (isVisible) {
            globeRef.current.resumeAnimation?.();
          } else {
            globeRef.current.pauseAnimation?.();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(container);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (observer && container) observer.unobserve(container);
    };
  }, [useFallback, textureError]);

  // Dispose renderer on unmount
  useEffect(() => {
    return () => {
      if (globeRef.current) {
        try {
          globeRef.current.pauseAnimation?.();
          const renderer = globeRef.current.renderer?.();
          if (renderer) {
            renderer.dispose();
            renderer.forceContextLoss?.();
          }
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, []);

  // NCT of Delhi marker data
  const delhiMarker = useMemo(
    () => [
      {
        lat: 28.6139,
        lng: 77.209,
        name: 'NCT of Delhi',
      },
    ],
    []
  );

  // 3-4 thin orbit arcs with tiny moving satellite dot
  const arcsData = useMemo(
    () => [
      // Faint orbital path 1 (LEO Sun-Synchronous Polar)
      {
        startLat: -35,
        startLng: 75,
        endLat: 50,
        endLng: 80,
        color: 'rgba(147, 197, 253, 0.18)',
        altitude: 0.22,
        dashLength: 1,
        dashGap: 0,
        animateTime: 0,
        stroke: 0.35,
      },
      // Moving satellite dot 1
      {
        startLat: -35,
        startLng: 75,
        endLat: 50,
        endLng: 80,
        color: '#93c5fd',
        altitude: 0.22,
        dashLength: 0.04,
        dashGap: 0.96,
        animateTime: 3200,
        stroke: 0.9,
      },

      // Faint orbital path 2 (Equatorial SAR sweep)
      {
        startLat: -15,
        startLng: 40,
        endLat: 38,
        endLng: 100,
        color: 'rgba(0, 255, 157, 0.15)',
        altitude: 0.28,
        dashLength: 1,
        dashGap: 0,
        animateTime: 0,
        stroke: 0.35,
      },
      // Moving satellite dot 2
      {
        startLat: -15,
        startLng: 40,
        endLat: 38,
        endLng: 100,
        color: '#00ff9d',
        altitude: 0.28,
        dashLength: 0.035,
        dashGap: 0.965,
        animateTime: 4000,
        stroke: 0.9,
      },

      // Faint orbital path 3 (Inclined Sentinel Orbit)
      {
        startLat: 45,
        startLng: 30,
        endLat: 2,
        endLng: 120,
        color: 'rgba(0, 212, 255, 0.15)',
        altitude: 0.34,
        dashLength: 1,
        dashGap: 0,
        animateTime: 0,
        stroke: 0.35,
      },
      // Moving satellite dot 3
      {
        startLat: 45,
        startLng: 30,
        endLat: 2,
        endLng: 120,
        color: '#00d4ff',
        altitude: 0.34,
        dashLength: 0.04,
        dashGap: 0.96,
        animateTime: 4600,
        stroke: 0.9,
      },

      // Faint orbital path 4 (NCT Delhi coverage corridor)
      {
        startLat: 15,
        startLng: 18,
        endLat: 32,
        endLng: 110,
        color: 'rgba(147, 197, 253, 0.16)',
        altitude: 0.29,
        dashLength: 1,
        dashGap: 0,
        animateTime: 0,
        stroke: 0.35,
      },
      // Moving satellite dot 4
      {
        startLat: 15,
        startLng: 18,
        endLat: 32,
        endLng: 110,
        color: '#a7f3d0',
        altitude: 0.29,
        dashLength: 0.035,
        dashGap: 0.965,
        animateTime: 3600,
        stroke: 0.9,
      },
    ],
    []
  );

  // If fallback is active or texture failed to load, render CSS globe
  if (useFallback || textureError) {
    return (
      <div ref={containerRef} className="w-full flex items-center justify-center">
        <GlobeFallback size={dimensions.width} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full flex items-center justify-center select-none"
      style={{
        minHeight: `${dimensions.height}px`,
        maxWidth: '100%',
      }}
    >
      {/* Soft atmospheric backlight halo */}
      <div className="absolute inset-4 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="/textures/earth-blue-marble.jpg"
        backgroundColor="rgba(0,0,0,0)"
        showAtmosphere={true}
        atmosphereColor="#93c5fd"
        atmosphereAltitude={0.12}
        // Marker rings over NCT of Delhi
        ringsData={delhiMarker}
        ringLat={(d: any) => d.lat}
        ringLng={(d: any) => d.lng}
        ringColor={() => (t: number) => `rgba(0, 255, 157, ${Math.max(0, 1 - t)})`}
        ringMaxRadius={3.5}
        ringPropagationSpeed={1.8}
        ringRepeatPeriod={1600}
        // HTML marker badge over NCT of Delhi
        htmlElementsData={delhiMarker}
        htmlLat={(d: any) => d.lat}
        htmlLng={(d: any) => d.lng}
        htmlAltitude={0.015}
        htmlElement={(d: any) => {
          const el = document.createElement('div');
          el.innerHTML = `
            <div style="display:flex;align-items:center;gap:6px;transform:translate(-50%,-50%);pointer-events:none;user-select:none;">
              <div style="position:relative;width:8px;height:8px;border-radius:50%;background:#22c55e;border:1.5px solid #0b0f0e;"></div>
              <div style="font-family:Inter,sans-serif;font-size:10px;font-weight:600;color:#e6ede9;background:#111816;padding:2px 6px;border-radius:4px;border:1px solid #1f2a26;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.6);">
                ${d.name}
              </div>
            </div>
          `;
          return el;
        }}
        // Thin orbit arcs & moving satellite dots
        arcsData={arcsData}
        arcColor={(d: any) => d.color}
        arcAltitude={(d: any) => d.altitude}
        arcStroke={(d: any) => d.stroke}
        arcDashLength={(d: any) => d.dashLength}
        arcDashGap={(d: any) => d.dashGap}
        arcDashAnimateTime={(d: any) => d.animateTime}
        arcsTransitionDuration={0}
        onGlobeReady={handleGlobeReady}
      />
    </div>
  );
}

export default HeroGlobe;
