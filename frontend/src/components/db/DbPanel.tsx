import { useState } from 'react';
import { Database, Loader2, MapPinned } from 'lucide-react';
import { isDbConfigured, fetchAlertZoneChecks, AlertZoneCheck } from '../../lib/db';
import { useDbStatus } from './DbStatusChip';

/** Database status and a PostGIS spatial check run by the database itself. */
export function DbPanel() {
  const s = useDbStatus();
  const [rows, setRows] = useState<AlertZoneCheck[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      setRows(await fetchAlertZoneChecks());
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Query failed');
    } finally {
      setBusy(false);
    }
  };

  const inside = rows ? rows.filter((r) => r.inside_zone).length : 0;

  return (
    <div className="p-5 rounded-lg bg-[#121212] border border-[#2e2e2e] flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-[#facc15]" />
        <h2 className="text-sm font-semibold text-[#f5f5f0]">Database</h2>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <dt className="text-[#8f8f86]">Backend</dt>
          <dd className="text-[#f5f5f0] mt-0.5">{isDbConfigured() ? 'Supabase (PostgreSQL + PostGIS)' : 'Browser storage only'}</dd>
        </div>
        <div>
          <dt className="text-[#8f8f86]">Status</dt>
          <dd className="text-[#f5f5f0] mt-0.5">
            {s.state}
            {s.lastSync ? ` · last sync ${new Date(s.lastSync).toLocaleTimeString()}` : ''}
          </dd>
        </div>
        <div>
          <dt className="text-[#8f8f86]">Project</dt>
          <dd className="text-[#f5f5f0] mt-0.5 font-mono">{s.host || '—'}</dd>
        </div>
      </dl>
      <p className="text-[11px] text-[#b5b5ad]">
        Tables: alerts (case state), ledger_blocks and chain_anchors (append-only: the database rejects updates and
        deletes), zones (PostGIS geometry). The browser keeps a local copy so the app keeps working if the database is
        unreachable.
      </p>
      {isDbConfigured() && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="self-start inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#facc15]/50 text-[#facc15] text-sm font-medium hover:bg-[#facc15]/10 disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPinned className="w-4 h-4" />}
            Run PostGIS check: are alerts inside their zone?
          </button>
          {err && <p className="text-xs text-[#fca5a5]">{err}</p>}
          {rows && (
            <p className="text-sm text-[#f5f5f0]">
              The database checked {rows.length} alerts with <span className="font-mono">ST_Contains</span>:{' '}
              <span className="text-[#86efac]">{inside} inside</span> their protected zone,{' '}
              <span className="text-[#fbbf24]">{rows.length - inside} outside</span> (alert point outside the polygon; the
              detection still overlaps the zone).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
