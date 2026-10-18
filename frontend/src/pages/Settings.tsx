import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ledgerApi } from '../api/ledger.api';
import { User, Shield, Lock, Server, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export function Settings() {
  const { user } = useAuth();
  const [ledgerBlocks, setLedgerBlocks] = useState<any[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; chainLength: number; brokenAt: number | null } | null>(null);

  useEffect(() => {
    ledgerApi.getAll().then((data: any) => {
      setLedgerBlocks(data?.blocks || data || []);
    }).catch(() => {});
  }, []);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res: any = await ledgerApi.verify();
      setVerifyResult(res);
    } catch {
      setVerifyResult({ valid: false, chainLength: 0, brokenAt: 1 });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-border">
        <h1 className="text-xl font-semibold text-text">System settings & operator console</h1>
        <p className="text-xs text-muted mt-0.5">
          Account identity, node parameters, and cryptographic ledger verification
        </p>
      </div>

      {/* Operator Identity Card */}
      <div className="p-5 rounded-lg bg-panel border border-border flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <User className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-text">Operator profile</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-md bg-panel-light border border-border flex flex-col">
            <span className="text-muted text-[10px]">Email address</span>
            <span className="text-text font-mono font-medium mt-0.5 truncate">{user?.email}</span>
          </div>

          <div className="p-3 rounded-md bg-panel-light border border-border flex flex-col">
            <span className="text-muted text-[10px]">Security role</span>
            <span className="text-accent font-mono font-semibold uppercase mt-0.5">{user?.role}</span>
          </div>

          <div className="p-3 rounded-md bg-panel-light border border-border flex flex-col">
            <span className="text-muted text-[10px]">Session auth</span>
            <span className="text-text font-mono mt-0.5">JWT HttpOnly Cookie</span>
          </div>
        </div>
      </div>

      {/* System Telemetry Card */}
      <div className="p-5 rounded-lg bg-panel border border-border flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Server className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-text">Node configuration</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-md bg-panel-light border border-border flex flex-col gap-1">
            <span className="text-muted text-[10px]">Primary data feed</span>
            <span className="text-text font-medium">Copernicus Sentinel-1 (C-Band SAR) & Sentinel-2 (MSI)</span>
          </div>

          <div className="p-3 rounded-md bg-panel-light border border-border flex flex-col gap-1">
            <span className="text-muted text-[10px]">Database engine</span>
            <span className="text-text font-medium">SQLite WAL mode (sentineleye.db)</span>
          </div>

          <div className="p-3 rounded-md bg-panel-light border border-border flex flex-col gap-1">
            <span className="text-muted text-[10px]">Detection engine</span>
            <span className="text-text font-medium">Off-thread Web Worker with multi-spectral tensor fusion</span>
          </div>

          <div className="p-3 rounded-md bg-panel-light border border-border flex flex-col gap-1">
            <span className="text-muted text-[10px]">Cadastral boundary engine</span>
            <span className="text-text font-medium">GeoJSON polygon intersection with area_m2 computation</span>
          </div>
        </div>
      </div>

      {/* Cryptographic Ledger Viewer Card */}
      <div className="p-5 rounded-lg bg-panel border border-border flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-text">Cryptographic ledger verification</h2>
          </div>

          <button
            onClick={handleVerify}
            disabled={verifying}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent text-bg font-semibold text-xs hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
            <span>{verifying ? 'Recomputing chain...' : 'Recompute SHA-256 chain'}</span>
          </button>
        </div>

        {verifyResult && (
          <div
            className={`p-3 rounded-md border text-xs flex items-center gap-2 ${
              verifyResult.valid
                ? 'bg-accent/10 border-accent/30 text-accent'
                : 'bg-critical/10 border-critical/30 text-critical'
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

        <div className="flex items-center justify-between text-xs text-muted">
          <span>Recorded blocks: {ledgerBlocks.length}</span>
          <span className="font-mono text-[11px]">Algorithm: SHA-256 sequential state root</span>
        </div>

        {/* Recent Blocks Table */}
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-panel-light border-b border-border text-[10px] text-muted uppercase">
              <tr>
                <th className="py-2 px-3">Block #</th>
                <th className="py-2 px-3">Case ID</th>
                <th className="py-2 px-3">SHA-256 Hash</th>
                <th className="py-2 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-[11px]">
              {ledgerBlocks.slice(0, 8).map((b: any) => (
                <tr key={b.id || b.block_number} className="hover:bg-panel-light/50">
                  <td className="py-2 px-3 text-muted">#{b.id || b.block_number}</td>
                  <td className="py-2 px-3 text-text font-medium">{b.case_id}</td>
                  <td className="py-2 px-3 text-accent truncate max-w-[200px]">{b.hash}</td>
                  <td className="py-2 px-3 text-muted">{b.timestamp?.slice(0, 19).replace('T', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
