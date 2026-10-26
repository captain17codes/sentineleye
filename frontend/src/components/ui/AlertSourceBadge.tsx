import React from 'react';
import { Alert } from '../../types/alert.types';

interface AlertSourceBadgeProps {
  alert?: Partial<Alert>;
  isReal?: boolean;
  className?: string;
}

export function AlertSourceBadge({ alert, isReal, className = '' }: AlertSourceBadgeProps) {
  // REAL only for alerts computed from real Sentinel-2 pixels.
  const isRealScene = isReal ?? alert?.is_real_scene === true;
  const isModeledSite = !isRealScene && alert?.data_source === 'real';

  if (isModeledSite) {
    return (
      <span
        title="Synthetic arrays modeled on a real site"
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider bg-[#0c1d2a] text-[#7dd3fc] border border-[#38bdf8]/40 select-none shadow-sm ${className}`}
      >
        MODELED SITE
      </span>
    );
  }

  if (isRealScene) {
    return (
      <span
        title="Computed from real Copernicus Sentinel-2 L2A imagery"
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider bg-[#0f291e] text-[#4ade80] border border-[#22c55e]/50 select-none shadow-sm ${className}`}
      >
        REAL
      </span>
    );
  }

  return (
    <span
      title="Synthesized calibration scenario (seeded ground truth)"
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider bg-[#2a1d0c] text-[#fbbf24] border border-[#f59e0b]/40 select-none shadow-sm ${className}`}
    >
      SIMULATED
    </span>
  );
}
