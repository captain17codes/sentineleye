import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';

export function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[70vh] p-4 select-none">
      <div className="p-8 max-w-md rounded-lg bg-panel border border-border text-center flex flex-col items-center gap-4 shadow-xl">
        <div className="w-12 h-12 rounded-full bg-critical/10 border border-critical/30 flex items-center justify-center text-critical">
          <Compass className="w-6 h-6" />
        </div>
        <div className="font-mono text-3xl font-bold text-critical">404</div>
        <h1 className="text-base font-semibold text-text">Page not found</h1>
        <p className="text-xs text-muted leading-relaxed">
          The requested coordinate vector or administrative resource does not exist within the SentinelEye registry.
        </p>
        <Link
          to="/"
          className="mt-2 flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-bg font-semibold text-xs hover:bg-accent/90 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return home</span>
        </Link>
      </div>
    </div>
  );
}
