import { cn } from '../../utils/cn';

interface LivePulseProps {
  color?: 'neon' | 'red' | 'amber' | 'cyan';
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function LivePulse({ color = 'neon', label, size = 'sm', className }: LivePulseProps) {
  const dotColor = {
    neon: 'bg-neon',
    red: 'bg-alert-red',
    amber: 'bg-alert-amber',
    cyan: 'bg-cyan',
  }[color];

  const ringColor = {
    neon: 'bg-neon/60',
    red: 'bg-alert-red/60',
    amber: 'bg-alert-amber/60',
    cyan: 'bg-cyan/60',
  }[color];

  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  const ringSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="relative flex items-center justify-center">
        <span className={cn('animate-ping absolute inline-flex rounded-full opacity-75', ringSize, ringColor)} />
        <span className={cn('relative inline-flex rounded-full', dotSize, dotColor)} />
      </span>
      {label && <span className="font-mono text-xs uppercase tracking-wider text-muted">{label}</span>}
    </span>
  );
}
