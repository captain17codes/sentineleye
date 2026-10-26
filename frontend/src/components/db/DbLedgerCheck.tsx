import { useState } from 'react';
import { Database, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { isDbConfigured, compareChainWithDb, DbComparison } from '../../lib/db';
import { getLedgerChain } from '../../engine/ledger';
import { useDbStatus } from './DbStatusChip';

/** Compares the browser's ledger with the append-only copy stored in Supabase. */
export function DbLedgerCheck() {
  const s = useDbStatus();
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<DbComparison | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      setRes(await compareChainWithDb(await getLedgerChain()));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not reach the database');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-5 rounded-lg bg-[#121212] border border-[#2e2e2e] flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#facc15]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#f5f5f0]">Database copy (Supabase)</span>
          </div>
          <p className="text-[11px] text-[#b5b5ad] mt-1">
            {isDbConfigured()
              ? 'Every block is also appended to a PostgreSQL table that rejects updates and deletes. Comparing the browser chain with that copy shows whether anything was changed afterwards.'
              : 'Not connected. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to mirror the ledger to an append-only database table.'}
          </p>
        </div>
        {isDbConfigured() && (
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#facc15]/50 text-[#facc15] text-sm font-medium hover:bg-[#facc15]/10 disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            Compare with database
          </button>
        )}
      </div>
      {s.state === 'error' && !res && <p className="text-xs text-[#fca5a5]">Database unreachable: {s.message}</p>}
      {err && <p className="text-xs text-[#fca5a5]">{err}</p>}
      {res && (
        <div
          className={`flex items-start gap-2 text-sm px-3 py-2 rounded-md border ${
            res.firstMismatch === null ? 'border-[#22c55e]/50 text-[#86efac]' : 'border-[#ef4444]/50 text-[#fca5a5]'
          }`}
        >
          {res.firstMismatch === null ? <ShieldCheck className="w-4 h-4 mt-0.5" /> : <ShieldAlert className="w-4 h-4 mt-0.5" />}
          <span>
            {res.firstMismatch === null
              ? `Match: all ${res.localBlocks - res.missingInDb} stored blocks are identical to the database copy.`
              : `Mismatch: block #${res.firstMismatch} in the browser differs from the copy in the database. The stored copy was not changed.`}
            {res.missingInDb > 0 && ` ${res.missingInDb} newest block(s) not synced yet.`}
          </span>
        </div>
      )}
    </div>
  );
}
