import React from 'react';
import { cn } from '../../utils/cn';
import { AlertSeverity } from '../../types/alert.types';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'low' | 'medium' | 'high' | 'critical' | 'simulation' | 'neon' | 'cyan' | 'neutral';
  severity?: AlertSeverity;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant, severity, size = 'sm', className }: BadgeProps) {
  // If severity prop is provided, resolve directly
  const activeVariant = severity
    ? (severity.toLowerCase() as 'low' | 'medium' | 'high' | 'critical')
    : variant || 'neutral';

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px] tracking-wider',
    sm: 'px-2.5 py-0.5 text-xs tracking-wider',
    md: 'px-3 py-1 text-xs tracking-wide',
  };

  const variantClasses = {
    low: 'bg-neon/10 text-neon border-neon/30',
    medium: 'bg-alert-amber/10 text-alert-amber border-alert-amber/30',
    high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    critical: 'bg-alert-red/15 text-alert-red border-alert-red/40',
    simulation: 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-mono font-bold',
    neon: 'bg-neon/15 text-neon border-neon/40 shadow-neon-sm',
    cyan: 'bg-cyan/15 text-cyan border-cyan/40',
    neutral: 'bg-white/5 text-muted border-white/10',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-mono uppercase rounded-full border transition-colors',
        sizeClasses[size],
        variantClasses[activeVariant],
        className
      )}
    >
      {activeVariant === 'simulation' && <span className="text-amber-400">⚠</span>}
      {children || (severity ? severity : activeVariant)}
    </span>
  );
}
