import React, { useState, useRef, useCallback, useEffect } from 'react';
import { EVIDENCE_SAMPLE, EvidenceData } from '../../data/evidence';
import { Sliders, Shield, AlertTriangle, Satellite, Eye, EyeOff } from 'lucide-react';

interface EvidenceSliderProps {
  data?: EvidenceData;
  className?: string;
}

export function EvidenceSlider({ data = EVIDENCE_SAMPLE, className = '' }: EvidenceSliderProps) {
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage 0..100
  const [showDetectedChanges, setShowDetectedChanges] = useState<boolean>(true);
  const [beforeLoaded, setBeforeLoaded] = useState<boolean>(false);
  const [afterLoaded, setAfterLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  // Position calculation from clientX
  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percentage);
  }, []);

  // Pointer event handlers (handles mouse, touch, and stylus smoothly at 60fps)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Left mouse button or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isDraggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      updatePosition(e.clientX);
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Keyboard accessibility
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      setSliderPos((prev) => Math.max(0, prev - 2));
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      setSliderPos((prev) => Math.min(100, prev + 2));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSliderPos(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSliderPos(100);
    }
  };

  const allLoaded = beforeLoaded && afterLoaded;

  return (
    <section
      id="evidence-validation"
      className={`relative w-full pt-16 pb-12 overflow-hidden select-none ${className}`}
    >
      {/* ── Background Subtle Dark Cloud / Space Texture ── */}
      <div
        className="evidence-space-bg absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 35%, rgba(56, 189, 248, 0.4) 0%, transparent 50%),
            radial-gradient(circle at 75% 65%, rgba(34, 197, 94, 0.3) 0%, transparent 60%)
          `,
        }}
      />

      {/* ── Drifting Satellite Model (purely decorative, disabled on prefers-reduced-motion) ── */}
      <div
        aria-hidden="true"
        className="satellite-drift absolute top-28 left-6 sm:left-12 pointer-events-none opacity-40 z-0"
      >
        <svg
          width="42"
          height="42"
          viewBox="0 0 48 48"
          fill="none"
          stroke="#8a9a93"
          strokeWidth="1.5"
          className="text-muted"
        >
          {/* Main bus */}
          <rect x="18" y="18" width="12" height="12" rx="1.5" fill="#111816" stroke="#22c55e" strokeWidth="1.5" />
          {/* Solar Panel Wings */}
          <rect x="2" y="21" width="12" height="6" fill="#1a2e26" stroke="#38bdf8" strokeWidth="1" />
          <line x1="6" y1="21" x2="6" y2="27" stroke="#38bdf8" strokeWidth="0.75" />
          <line x1="10" y1="21" x2="10" y2="27" stroke="#38bdf8" strokeWidth="0.75" />
          <rect x="34" y="21" width="12" height="6" fill="#1a2e26" stroke="#38bdf8" strokeWidth="1" />
          <line x1="38" y1="21" x2="38" y2="27" stroke="#38bdf8" strokeWidth="0.75" />
          <line x1="42" y1="21" x2="42" y2="27" stroke="#38bdf8" strokeWidth="0.75" />
          {/* Antenna */}
          <line x1="24" y1="18" x2="24" y2="10" stroke="#8a9a93" strokeWidth="1.2" />
          <circle cx="24" cy="9" r="1.5" fill="#22c55e" />
        </svg>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 flex flex-col items-center">
        {/* ── Section Title & Subtitle ── */}
        <div className="flex flex-col items-center text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#e6ede9] font-sans">
            Evidence validation
          </h2>
          <p className="mt-1.5 text-sm sm:text-base font-medium text-sky-400 font-sans tracking-normal">
            Historical vs current analysis
          </p>
        </div>

        {/* ── Main Comparison Card (16:10, max-w ~1100px, 16px radius, #1f2a26 border) ── */}
        <div
          ref={containerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="relative w-full max-w-[1100px] aspect-[16/10] rounded-2xl overflow-hidden border border-[#1f2a26] bg-[#111816] shadow-2xl cursor-ew-resize group select-none"
          style={{ touchAction: 'pan-y' }}
        >
          {/* Loading Skeleton Shimmer */}
          {!allLoaded && !hasError && (
            <div className="absolute inset-0 bg-[#111816] flex items-center justify-center z-10">
              <div className="w-full h-full animate-pulse bg-gradient-to-r from-[#111816] via-[#1a2622] to-[#111816]" />
              <div className="absolute flex flex-col items-center gap-2 text-xs text-muted">
                <span className="live-dot" />
                <span>Loading Sentinel-2 bitemporal evidence...</span>
              </div>
            </div>
          )}

          {/* Layer 1: AFTER image (Oct 2024, Full Background) */}
          <div className="absolute inset-0 pointer-events-none">
            <img
              src={data.afterImage}
              width={1600}
              height={1000}
              loading="lazy"
              decoding="async"
              onLoad={() => setAfterLoaded(true)}
              onError={() => {
                setAfterLoaded(true);
                setHasError(true);
              }}
              alt={`Sentinel-2 current terrain ${data.afterDate}`}
              className="w-full h-full object-cover block select-none pointer-events-none"
            />

            {/* Change overlay polygons (visible on AFTER side, clipped to slider position) */}
            {showDetectedChanges && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-200"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{
                  clipPath: `inset(0 0 0 ${sliderPos}%)`,
                }}
              >
                {data.polygons.map((poly) => {
                  const pointsStr = poly.pointsPercentage.map(([x, y]) => `${x},${y}`).join(' ');
                  const strokeCol = poly.isInsideProtectedZone ? '#ef4444' : '#f59e0b';
                  const fillCol = poly.isInsideProtectedZone ? 'rgba(239, 68, 68, 0.22)' : 'rgba(245, 158, 11, 0.20)';

                  return (
                    <g key={poly.id}>
                      <polygon
                        points={pointsStr}
                        fill={fillCol}
                        stroke={strokeCol}
                        strokeWidth="0.65"
                        strokeDasharray={poly.isInsideProtectedZone ? undefined : '1.5 1'}
                      />
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          {/* Layer 2: BEFORE image (Oct 2020, Clipped by divider at 60fps via clip-path) */}
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{
              clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
            }}
          >
            <img
              src={data.beforeImage}
              width={1600}
              height={1000}
              loading="lazy"
              decoding="async"
              onLoad={() => setBeforeLoaded(true)}
              onError={() => {
                setBeforeLoaded(true);
                setHasError(true);
              }}
              alt={`Sentinel-2 historical baseline ${data.beforeDate}`}
              className="w-full h-full object-cover block select-none pointer-events-none"
            />
          </div>

          {/* Top-Left Corner Chip: Before Date (Green-tinted) */}
          <div className="absolute top-4 left-4 z-20 pointer-events-none flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#111816] border border-[#2a3832] text-[#22c55e] text-xs font-medium font-sans shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
            <span>Before · {data.beforeDate}</span>
          </div>

          {/* Top-Right Corner Chip: After Date (Muted Red) */}
          <div className="absolute top-4 right-4 z-20 pointer-events-none flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#111816] border border-[#2a3832] text-[#ef4444] text-xs font-medium font-sans shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
            <span>After · {data.afterDate}</span>
            {hasError && (
              <span className="ml-1 px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#16201c] text-amber-400 border border-amber-400/30">
                Simulation
              </span>
            )}
          </div>

          {/* ── 3px Green Vertical Divider Line & 40px Round Handle ── */}
          <div
            className="absolute top-0 bottom-0 w-[3px] bg-[#22c55e] z-30 pointer-events-none"
            style={{
              left: `calc(${sliderPos}% - 1.5px)`,
              boxShadow: '0 0 10px rgba(34, 197, 94, 0.4)',
            }}
          >
            <div
              ref={handleRef}
              tabIndex={0}
              role="slider"
              aria-label="Satellite imagery comparison percentage"
              aria-valuenow={Math.round(sliderPos)}
              aria-valuemin={0}
              aria-valuemax={100}
              onKeyDown={onKeyDown}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-[#22c55e] border-2 border-[#0b0f0e] flex items-center justify-center pointer-events-auto cursor-ew-resize shadow-xl focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:ring-offset-2 focus:ring-offset-[#0b0f0e] transition-transform active:scale-95"
            >
              {/* Dark arrows icon */}
              <Sliders className="w-4 h-4 text-[#0b0f0e]" />
            </div>
          </div>
        </div>

        {/* ── Controls & Caption Row Below Card ── */}
        <div className="w-full max-w-[1100px] mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted">
          {/* Toggle Button: Show detected changes */}
          <button
            type="button"
            onClick={() => setShowDetectedChanges(!showDetectedChanges)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
              showDetectedChanges
                ? 'bg-accent/15 border-accent text-accent'
                : 'bg-panel border-border text-muted hover:text-text hover:bg-panel-light'
            }`}
          >
            {showDetectedChanges ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Show detected changes</span>
          </button>

          {/* Caption row with metrics */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted">
            <span className="text-text font-medium font-sans">
              Detected change: <strong className="text-text">{data.affectedAreaHa} ha</strong>
            </span>
            <span>•</span>
            <span className="text-critical font-medium font-sans">
              Class: {data.changeClass}
            </span>
            <span>•</span>
            <span className="text-muted font-sans">
              Source: {data.sensor}
            </span>
          </div>
        </div>

        {/* ── Footer Attribution Text ── */}
        <div className="w-full max-w-[1100px] mt-2 text-center sm:text-left text-[11px] font-mono text-muted/70">
          {data.attribution}
        </div>
      </div>
    </section>
  );
}

export default EvidenceSlider;
