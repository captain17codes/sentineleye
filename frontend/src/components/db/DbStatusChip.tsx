import { useEffect, useState } from 'react';
import { Database } from 'lucide-react';
import { isDbConfigured, getDbStatus, subscribeDbStatus, pingDb, syncZones, queueAlertsSync, queueLedgerSync, DbStatus } from '../../lib/db';
import { getAlerts } from '../../engine/store/alertStore';
import { getLedgerChain } from '../../engine/ledger';
import { SEEDED_ZONES } from '../../api/seededData';

let started = false;

export function useDbStatus(): DbStatus {
  const [s, setS] = useState<DbStatus>(getDbStatus());
  useEffect(() => subscribeDbStatus(setS), []);
  return s;
}

/** Small top-bar indicator; also pings the database and pushes zones, alerts and the chain once per load. */
export function DbStatusChip() {
  const s = useDbStatus();
  useEffect(() => {
    if (!isDbConfigured() || started) return;
    started = true;
    // On every load: push zones, then the current alerts and evidence chain, so changes made just before
    // a tab was closed (or while offline) still reach the database.
    void pingDb()
      .then(() => syncZones(SEEDED_ZONES))
      .then(() => {
        queueAlertsSync(getAlerts());
        return getLedgerChain();
      })
      .then((chain) => queueLedgerSync(chain))
      .catch(() => undefined);
  }, []);

  const map: Record<DbStatus['state'], { text: string; cls: string }> = {
    off: { text: 'DB: browser only', cls: 'text-[#98a2b3] border-[#222c3d]' },
    connecting: { text: 'DB: connecting…', cls: 'text-[#98a2b3] border-[#222c3d]' },
    online: { text: 'DB: Supabase synced', cls: 'text-[#86efac] border-[#22c55e]/40' },
    error: { text: 'DB: offline (local copy)', cls: 'text-[#fca5a5] border-[#ef4444]/40' },
  };
  const m = map[s.state];
  return (
    <span
      title={s.message || (s.lastSync ? `Last sync ${new Date(s.lastSync).toLocaleTimeString()} · ${s.host}` : s.host || 'Not configured')}
      className={`hidden md:inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono border bg-raised ${m.cls}`}
    >
      <Database className="w-3 h-3" />
      {m.text}
    </span>
  );
}
