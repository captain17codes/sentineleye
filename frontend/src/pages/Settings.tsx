import React, { useState, useEffect } from 'react';
import { DbPanel } from '../components/db/DbPanel';
import { useAuth } from '../context/AuthContext';
import { getLedgerChain, verifyChain, LedgerBlock } from '../engine/ledger';
import { EmptyState } from '../components/ui/StatusStates';
import { User, Shield, Lock, Server, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export function Settings() {
  const { user } = useAuth();
  const [ledgerBlocks, setLedgerBlocks] = useState<LedgerBlock[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; chainLength: number; brokenAt: number | null } | null>(null);

  useEffect(() => {
    let mounted = true;
    getLedgerChain()
      .then((chain) => {
        if (mounted) setLedgerBlocks(Array.isArray(chain) ? chain : []);
      })
      .catch((err) => {
        console.error('Failed to load ledger in settings:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const chain = await getLedgerChain();
      const res = await verifyChain(chain);
      setVerifyResult({
        valid: res.valid,
        chainLength: res.blocksVerified,
        brokenAt: res.firstInvalidIndex,
      });
    } catch {
      setVerifyResult({ valid: false, chainLength: 0, brokenAt: 1 });
    } finally {
      setVerifying(false);
    }
  };

  const safeBlocks = Array.isArray(ledgerBlocks) ? ledgerBlocks : [];

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto select-none">
      {/* Header */}
      <div className="pb-4 border-b border-[#222c3d]">
        <h1 className="text-xl font-semibold text-[#e6eaf0]">System settings & operator console</h1>
        <p className="text-xs text-[#98a2b3] mt-0.5">
          Account identity, node parameters, and cryptographic ledger verification
        </p>
      </div>

      <DbPanel />

      {/* Operator Identity Card */}
      <div className="p-5 rounded-lg bg-[#111826] border border-[#222c3d] flex flex-col gap-4">
        <div className="flex flex-col gap-1 pb-2 border-b border-[#222c3d]">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#facc15]" />
            <h2 className="text-sm font-semibold text-[#e6eaf0]">Operator profile</h2>
          </div>
          <p className="text-xs text-[#98a2b3] kpi-subtitle">
            Operator profile: Authenticated administrative session identity and active role permissions
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-md bg-[#172031] border border-[#222c3d] flex flex-col">
            <span className="text-[#98a2b3] text-[10px]">Email address</span>
            <span className="text-[#e6eaf0] font-mono font-medium mt-0.5 truncate">{user?.email || 'operator@sentineleye.com'}</span>
          </div>

          <div className="p-3 rounded-md bg-[#172031] border border-[#222c3d] flex flex-col">
            <span className="text-[#98a2b3] text-[10px]">Security role</span>
            <span className="text-[#facc15] font-mono font-semibold uppercase mt-0.5">{user?.role || 'operator'}</span>
          </div>

          <div className="p-3 rounded-md bg-[#172031] border border-[#222c3d] flex flex-col">
            <span className="text-[#98a2b3] text-[10px]">Session auth</span>
            <span className="text-[#e6eaf0] font-mono mt-0.5">JWT HttpOnly / Local Session</span>
          </div>
        </div>
      </div>

      {/* System Telemetry Card */}
      <div className="p-5 rounded-lg bg-[#111826] border border-[#222c3d] flex flex-col gap-4">
        <div className="flex flex-col gap-1 pb-2 border-b border-[#222c3d]">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-[#facc15]" />
            <h2 className="text-sm font-semibold text-[#e6eaf0]">Node configuration</h2>
          </div>
          <p className="text-xs text-[#98a2b3] kpi-subtitle">
            Node configuration: Environmental runtime parameters, constellation ingest feeds, and worker threads
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-md bg-[#172031] border border-[#222c3d] flex flex-col gap-1">
            <span className="text-[#98a2b3] text-[10px]">Primary data feed</span>
            <span className="text-[#e6eaf0] font-medium">Sentinel-1 (C-Band SAR) & Sentinel-2 (MSI) Constellation Models</span>
          </div>

          <div className="p-3 rounded-md bg-[#172031] border border-[#222c3d] flex flex-col gap-1">
            <span className="text-[#98a2b3] text-[10px]">Database engine</span>
            <span className="text-[#e6eaf0] font-medium">Deterministic In-Browser Ingestion Engine + LocalStorage WAL</span>
          </div>

          <div className="p-3 rounded-md bg-[#172031] border border-[#222c3d] flex flex-col gap-1">
            <span className="text-[#98a2b3] text-[10px]">Detection engine</span>
            <span className="text-[#e6eaf0] font-medium">Dedicated Web Worker with bitemporal SAR/NDVI tensor fusion</span>
          </div>

          <div className="p-3 rounded-md bg-[#172031] border border-[#222c3d] flex flex-col gap-1">
            <span className="text-[#98a2b3] text-[10px]">Cadastral boundary engine</span>
            <span className="text-[#e6eaf0] font-medium">Turf.js computational geometry intersection & area_m² calculation</span>
          </div>
        </div>
      </div>

      {/* Cryptographic Ledger Viewer Card */}
      <div className="p-5 rounded-lg bg-[#111826] border border-[#222c3d] flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#222c3d]">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#facc15]" />
              <h2 className="text-sm font-semibold text-[#e6eaf0]">Cryptographic ledger verification</h2>
            </div>
            <p className="text-xs text-[#98a2b3] kpi-subtitle">
              Cryptographic ledger verification: Client-side validation of SHA-256 chain state roots
            </p>
          </div>

          <button
            onClick={handleVerify}
            disabled={verifying}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#facc15] text-[#0b1018] font-semibold text-xs hover:bg-[#eab308] disabled:opacity-50 transition-colors min-h-[38px] shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
            <span>{verifying ? 'Recomputing chain...' : 'Recompute SHA-256 chain'}</span>
          </button>
        </div>

        {verifyResult && (
          <div
            className={`p-3 rounded-md border text-xs flex items-center gap-2 ${
              verifyResult.valid
                ? 'bg-[#facc15]/10 border-[#facc15]/30 text-[#facc15]'
                : 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]'
            }`}
          >
            {verifyResult.valid ? (
              <>
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>
                  Ledger verification successful. All {verifyResult.chainLength} blocks recomputed from stored JSON with 100% hash consistency.
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>
                  Ledger verification mismatch detected at block #{verifyResult.brokenAt}.
                </span>
              </>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-[#98a2b3]">
          <span>Recorded blocks: {safeBlocks.length}</span>
          <span className="font-mono text-[11px]">Algorithm: SHA-256 sequential state root</span>
        </div>

        {/* Recent Blocks Table */}
        {safeBlocks.length === 0 ? (
          <EmptyState
            title="No ledger blocks recorded"
            message="No cryptographic chain blocks have been recorded in the browser's database yet."
          />
        ) : (
          <div className="rounded-md border border-[#222c3d] overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#172031] border-b border-[#222c3d] text-[10px] text-[#98a2b3] uppercase">
                <tr>
                  <th className="py-2 px-3">Block #</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">SHA-256 Hash</th>
                  <th className="py-2 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222c3d] text-[11px]">
                {safeBlocks.slice(0, 8).map((b) => (
                  <tr key={b.index ?? b.hash} className="hover:bg-[#172031]/50">
                    <td className="py-2 px-3 text-[#98a2b3]">#{b.index}</td>
                    <td className="py-2 px-3 text-[#e6eaf0] font-medium">{b.type}</td>
                    <td className="py-2 px-3 text-[#facc15] truncate max-w-[200px]">{b.hash}</td>
                    <td className="py-2 px-3 text-[#98a2b3]">{b.timestamp?.slice(0, 19).replace('T', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
