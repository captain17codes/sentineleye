import React from 'react';
import { Alert } from '../../types/alert.types';

interface AlertSourceBadgeProps {
  alert?: Partial<Alert>;
  isReal?: boolean;
  className?: string;
}

export function AlertSourceBadge({ alert, isReal, className = '' }: AlertSourceBadgeProps) {
  const isRealScene = isReal ?? (alert?.is_real_scene === true || alert?.data_source === 'real');

  if (isRealScene) {
    return (
      <span
        title="Derived from calibrated telemetry modeled on real target site"
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
