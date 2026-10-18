import React from 'react';

interface GlobeFallbackProps {
  className?: string;
  size?: number;
}

export function GlobeFallback({ className = '', size = 440 }: GlobeFallbackProps) {
  return (
    <div
      className={`relative flex items-center justify-center mx-auto select-none pointer-events-none ${className}`}
      style={{ width: `${size}px`, height: `${size}px`, maxWidth: '100%', aspectRatio: '1 / 1' }}
      aria-label="Earth Globe"
    >
      {/* Subtle atmospheric rim */}
      <div className="absolute inset-4 rounded-full bg-blue-500/5 blur-2xl pointer-events-none" />

      {/* Orbit Arc 1 */}
      <div
        className="absolute w-[116%] h-[36%] rounded-[100%] border border-blue-400/20 rotate-[22deg] pointer-events-none"
      >
        <div className="absolute top-1/2 left-[20%] -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent border border-bg" />
      </div>

      {/* Orbit Arc 2 */}
      <div
        className="absolute w-[112%] h-[40%] rounded-[100%] border border-blue-400/15 -rotate-[30deg] pointer-events-none"
      >
        <div className="absolute top-1/2 right-[24%] -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-sky-300 border border-bg" />
      </div>

      {/* Main Spherical Body (Dark Flat Gradient) */}
      <div
        className="relative w-[85%] h-[85%] rounded-full overflow-hidden border border-blue-300/20"
        style={{
          background: 'radial-gradient(circle at 38% 36%, #1a324a 0%, #0d1e2e 45%, #08131d 75%, #050b10 100%)',
          boxShadow: 'inset -24px -24px 60px rgba(0,0,0,0.9), inset 2px 2px 12px rgba(147,197,253,0.25)'
        }}
      >
        {/* Subtle latitude / longitude planetary grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(147,197,253,0.12) 100%),
              repeating-linear-gradient(0deg, transparent, transparent 32px, rgba(147,197,253,0.06) 32px, rgba(147,197,253,0.06) 33px),
              repeating-linear-gradient(90deg, transparent, transparent 32px, rgba(147,197,253,0.06) 32px, rgba(147,197,253,0.06) 33px)
            `
          }}
        />

        {/* Landmass hint (India & South Asia center) */}
        <div
          className="absolute inset-0 opacity-30 mix-blend-screen pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 55% 48%, rgba(56, 189, 248, 0.2) 0%, rgba(34, 197, 94, 0.12) 28%, transparent 60%)'
          }}
        />

        {/* Marker over NCT of Delhi */}
        <div className="absolute top-[44%] left-[55%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
          <span className="w-2.5 h-2.5 rounded-full bg-accent border-2 border-bg" />
          <div className="flex flex-col">
            <span className="font-sans text-[10px] font-semibold text-text bg-panel/90 border border-border px-2 py-0.5 rounded tracking-normal whitespace-nowrap">
              NCT of Delhi
            </span>
          </div>
        </div>

        {/* Thin pale blue atmosphere inner edge */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 16px rgba(147, 197, 253, 0.2)'
          }}
        />
      </div>
    </div>
  );
}

export default GlobeFallback;
