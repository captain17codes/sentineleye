import { cn } from '../../utils/cn';

interface SimulationBadgeProps {
  label?: string;
  className?: string;
  size?: 'xs' | 'sm';
}

export function SimulationBadge({ label = 'SIMULATION', className, size = 'sm' }: SimulationBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-mono font-bold uppercase rounded-md border border-amber-500/50 bg-amber-500/15 text-amber-300 tracking-wider shadow-[0_0_12px_rgba(245,158,11,0.2)]',
        size === 'xs' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[11px]',
        className
      )}
    >
      <span className="text-amber-400 font-black">⚠</span>
      {label}
    </span>
  );
}
