import React from 'react';

export function Footer() {
  return (
    <footer className="w-full border-t border-border py-8 px-4 text-center text-xs text-muted flex flex-col items-center gap-2 bg-panel select-none">
      <div className="flex flex-wrap items-center justify-center gap-2 text-text font-medium">
        <span>SentinelEye • Planetary intelligence for land protection</span>
        <span className="text-border">|</span>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20">
          Simulation
        </span>
      </div>
      <p className="max-w-2xl text-[11px] text-muted">
        All satellite imagery, radar bands, and alert notifications are synthetically generated for demonstration. Legal and statutory mappings are indicative only; verify with legal counsel.
      </p>
      <div className="text-[10px] font-mono text-muted/60 mt-1">
        SHA-256 Tamper-Evident Ledger Active • Copernicus Sentinel-1/2 Dual Band Pipeline
      </div>
    </footer>
  );
}
