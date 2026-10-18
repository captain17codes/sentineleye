import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'neon' | 'cyan' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export function NeonButton({
  variant = 'neon',
  size = 'md',
  loading = false,
  children,
  className,
  disabled,
  ...props
}: NeonButtonProps) {
  const base = 'relative inline-flex items-center justify-center gap-2 font-mono font-medium tracking-wide rounded-full transition-all duration-200 select-none';

  const sizes = {
    sm: 'px-4 py-1.5 text-xs',
    md: 'px-6 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base',
  };

  const variants = {
    neon: 'bg-neon text-space hover:bg-neon-dim shadow-neon hover:shadow-neon active:scale-95',
    cyan: 'bg-cyan text-space hover:bg-cyan-dim shadow-cyan active:scale-95',
    outline: 'bg-transparent border border-neon/40 text-neon hover:bg-neon/10 hover:border-neon/80 hover:shadow-neon-sm active:scale-95',
    ghost: 'bg-transparent text-muted hover:text-neon hover:bg-neon/5 active:scale-95',
    danger: 'bg-alert-red/10 border border-alert-red/40 text-alert-red hover:bg-alert-red/20 hover:shadow-red active:scale-95',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={cn(base, sizes[size], variants[variant], (disabled || loading) && 'opacity-50 cursor-not-allowed', className)}
      disabled={disabled || loading}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </motion.button>
  );
}
