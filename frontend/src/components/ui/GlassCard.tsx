import { cn } from '../../utils/cn';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: 'neon' | 'cyan' | 'red' | 'none';
  hover?: boolean;
}

export function GlassCard({ children, className, glow = 'none', hover = false }: GlassCardProps) {
  const glowClasses = {
    neon: 'shadow-neon border-neon/20',
    cyan: 'shadow-cyan border-cyan/20',
    red: 'shadow-red border-alert-red/20',
    none: 'border-border-glass',
  };

  return (
    <div
      className={cn(
        'glass rounded-2xl',
        glowClasses[glow],
        hover && 'transition-all duration-300 hover:-translate-y-1 hover:shadow-neon cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}
