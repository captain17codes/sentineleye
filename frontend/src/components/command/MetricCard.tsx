import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { cn } from '../../utils/cn';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: any;
  glow?: 'neon' | 'cyan' | 'red' | 'none';
  className?: string;
}

export function MetricCard({ label, value, subtext, icon: Icon, glow = 'none', className }: MetricCardProps) {
  return (
    <GlassCard glow={glow} className={cn('p-4 flex flex-col justify-between', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="label-mono">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-neon/70" />}
      </div>
      <div>
        <div className="text-2xl font-mono font-bold tracking-tight text-white">{value}</div>
        {subtext && <div className="text-[11px] font-mono text-muted mt-1">{subtext}</div>}
      </div>
    </GlassCard>
  );
}
