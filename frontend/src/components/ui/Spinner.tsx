import { cn } from '../../utils/cn';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: 'neon' | 'cyan' | 'white';
}

export function Spinner({ size = 'md', className, color = 'neon' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  const colorClasses = {
    neon: 'border-neon/20 border-t-neon',
    cyan: 'border-cyan/20 border-t-cyan',
    white: 'border-white/20 border-t-white',
  };

  return (
    <div
      className={cn(
        'rounded-full animate-spin',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
