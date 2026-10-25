import React from 'react';
import { Radar, AlertTriangle, FolderSearch, RefreshCw, Layers } from 'lucide-react';

interface LoadingStateProps {
  title?: string;
  message?: string;
  className?: string;
}

export function LoadingState({
  title = 'Synchronizing Telemetry...',
  message = 'Executing bitemporal tensor analysis across protected corridors...',
  className = '',
}: LoadingStateProps) {
  return (
    <div
      role="status"
      className={`p-12 flex flex-col items-center justify-center text-center rounded-xl bg-[#111816] border border-[#2a3832] select-none ${className}`}
    >
      <div className="relative w-12 h-12 mb-4 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-[#22c55e]/30 border-t-[#22c55e] animate-spin" />
        <Radar className="w-5 h-5 text-[#22c55e] animate-pulse" />
      </div>
      <h3 className="text-sm font-semibold text-[#f1f5f3] tracking-wide mb-1 font-mono">{title}</h3>
      <p className="text-xs text-[#b4c2bb] max-w-md leading-relaxed">{message}</p>
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = FolderSearch,
  title,
  message,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`p-10 flex flex-col items-center justify-center text-center rounded-xl bg-[#111816] border border-dashed border-[#2a3832] select-none ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-[#16201c] border border-[#2a3832] flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-[#b4c2bb]" />
      </div>
      <h3 className="text-sm font-semibold text-[#f1f5f3] mb-1">{title}</h3>
      <p className="text-xs text-[#b4c2bb] max-w-md leading-relaxed mb-4">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#16201c] hover:bg-[#111816] border border-[#22c55e] text-[#22c55e] hover:text-[#4ade80] text-xs font-semibold transition-colors min-h-[36px]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Telemetry Pipeline Error',
  message,
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`p-8 flex flex-col items-center justify-center text-center rounded-xl bg-[#221010] border border-[#ef4444]/40 select-none ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-[#361616] border border-[#ef4444]/50 flex items-center justify-center mb-3">
        <AlertTriangle className="w-6 h-6 text-[#ef4444]" />
      </div>
      <h3 className="text-sm font-semibold text-[#fecaca] mb-1">{title}</h3>
      <p className="text-xs text-[#fca5a5]/80 max-w-md leading-relaxed mb-4">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#361616] hover:bg-[#481c1c] border border-[#ef4444] text-[#fecaca] text-xs font-semibold transition-colors min-h-[36px]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry operation</span>
        </button>
      )}
    </div>
  );
}
