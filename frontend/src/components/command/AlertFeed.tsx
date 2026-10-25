import { useState } from 'react';
import { useAlerts } from '../../hooks/useAlerts';
import { AlertItem } from './AlertItem';
import { LivePulse } from '../ui/LivePulse';
import { Spinner } from '../ui/Spinner';
import { RefreshCw, Filter, AlertTriangle } from 'lucide-react';

export function AlertFeed() {
  const { alerts, loading, refreshAlerts, updateAlertStatus } = useAlerts();
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filtered = alerts.filter((a) => {
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-alert-amber" />
          <h3 className="font-mono text-sm font-bold text-white tracking-wider uppercase">
            Real-Time Alert Feed ({filtered.length})
          </h3>
          <LivePulse color="amber" />
        </div>

        <div className="flex items-center gap-2">
          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-space/80 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-neon"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-space/80 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-neon"
          >
            <option value="ALL">All Statuses</option>
            <option value="New">New</option>
            <option value="Verified">Verified</option>
            <option value="Notice Issued">Notice Drafted</option>
            <option value="Signed & Served">Signed & Served</option>
          </select>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={refreshAlerts}
            title="Refresh Feed"
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-muted hover:text-white transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Feed List */}
      <div className="flex flex-col gap-2.5 max-h-[600px] overflow-y-auto pr-1">
        {loading && alerts.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Spinner color="neon" size="md" />
            <span className="font-mono text-xs text-muted">Synchronizing Anomaly Vector...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-white/10 font-mono text-xs text-muted">
            No active alerts matching the selected filters.
          </div>
        ) : (
          filtered.map((alert) => (
            <AlertItem key={alert.id} alert={alert} onStatusChange={updateAlertStatus} />
          ))
        )}
      </div>
    </div>
  );
}
