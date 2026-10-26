import { useEffect, useState } from 'react';
import { Database } from 'lucide-react';
import { isDbConfigured, getDbStatus, subscribeDbStatus, pingDb, syncZones, DbStatus } from '../../lib/db';
import { SEEDED_ZONES } from '../../api/seededData';

let started = false;

export function useDbStatus(): DbStatus {
  const [s, setS] = useState<DbStatus>(getDbStatus());
  useEffect(() => subscribeDbStatus(setS), []);
  return s;
}

/** Small top-bar indicator; also pushes zones and pings the database once per session. */
export function DbStatusChip() {
  const s = useDbStatus();
  useEffect(() => {
    if (!isDbConfigured() || started) return;
    started = true;
    void pingDb().then(() => syncZones(SEEDED_ZONES));
  }, []);

  const map: Record<DbStatus['state'], { text: string; cls: string }> = {
    off: { text: 'DB: browser only', cls: 'text-[#b5b5ad] border-[#2e2e2e]' },
    connecting: { text: 'DB: connecting…', cls: 'text-[#b5b5ad] border-[#2e2e2e]' },
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
