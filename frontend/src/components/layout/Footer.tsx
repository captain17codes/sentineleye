import React from 'react';

export function Footer() {
  return (
    <footer className="w-full border-t border-border py-8 px-4 text-center text-xs text-muted flex flex-col items-center gap-2 bg-panel select-none">
      <div className="flex flex-wrap items-center justify-center gap-2 text-text font-medium">
        <span>SentinelEye • Planetary intelligence for land protection</span>
        <span className="text-border">|</span>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20">
          Demo Mode
        </span>
      </div>
      <p className="max-w-2xl text-[11px] text-[#b4c2bb] leading-relaxed">
        Demo mode: client-side simulation. Accounts, workflow and ledger are stored in your browser. Telemetry features calibrated scenes modeled on real sites (synthetic arrays) alongside controlled calibration seeds. Indicative zone polygons (generated).
      </p>
      <div className="text-[10px] font-mono text-[#8fa097] mt-1">
        WebCrypto ECDSA P-256 Ledger Active • Section 63 BSA 2023 Evidentiary Protocol
      </div>
    </footer>
  );
}
