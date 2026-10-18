import { useState } from 'react';
import { Alert, AlertStatus } from '../../types/alert.types';
import { Badge } from '../ui/Badge';
import { StatusStepper } from '../ui/StatusStepper';
import { SimulationBadge } from '../ui/SimulationBadge';
import { casesApi } from '../../api/cases.api';
import { ChevronDown, ChevronUp, FileText, Send, MapPin, Calendar, Clock } from 'lucide-react';
import { cn } from '../../utils/cn';

interface AlertItemProps {
  alert: Alert;
  onStatusChange: (id: number, status: AlertStatus, notes?: string) => Promise<void>;
}

export function AlertItem({ alert, onStatusChange }: AlertItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [caseCreated, setCaseCreated] = useState<{ id: number; ref: string } | null>(null);
  const [notes, setNotes] = useState('');

  const handleStepClick = async (nextStatus: AlertStatus) => {
    try {
      setLoadingAction(true);
      await onStatusChange(alert.id, nextStatus, notes);
      setNotes('');
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCreateCase = async () => {
    try {
      setLoadingAction(true);
      const res: any = await casesApi.create({ alert_id: alert.id, notes: 'Initiated from Command Center' });
      setCaseCreated({ id: res.id, ref: res.case_ref });
    } catch (err) {
      console.error('Failed to create case', err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!caseCreated) return;
    try {
      setLoadingAction(true);
      await casesApi.getPdf(caseCreated.id);
    } catch (err) {
      console.error('Failed to download PDF', err);
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-200 overflow-hidden',
        expanded
          ? 'bg-space/90 border-neon/40 shadow-neon-sm'
          : 'bg-white/[0.03] border-white/10 hover:border-white/20'
      )}
    >
      {/* Header Row */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <Badge severity={alert.severity} size="sm" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-white">
                {alert.zone_name || `Zone #${alert.zone_id}`}
              </span>
              <span className="font-mono text-xs text-muted">ID #{alert.id}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-muted mt-0.5">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-cyan" />
                {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(alert.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/90">
            {alert.status}
          </span>
          <button type="button" className="text-muted hover:text-white">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-white/10 flex flex-col gap-4">
          <p className="text-xs text-white/80 font-mono bg-white/5 p-3 rounded-lg border border-white/5">
            {alert.description || 'No automated observation notes recorded for this anomaly.'}
          </p>

          {/* Workflow Stepper */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="label-mono">Escalation & Enforcement Protocol</span>
              <SimulationBadge size="xs" label="SIMULATED DISPATCH" />
            </div>

            <div className="py-2">
              <StatusStepper
                currentStatus={alert.status}
                onStatusClick={handleStepClick}
                readonly={loadingAction}
              />
            </div>
          </div>

          {/* Actions & Case Creation */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Optional intervention note..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-space/80 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-muted focus:outline-none focus:border-neon w-60"
              />
              <button
                type="button"
                disabled={loadingAction}
                onClick={() => {
                  const nexts: Record<AlertStatus, AlertStatus> = {
                    New: 'Verified',
                    Verified: 'Notice Issued',
                    'Notice Issued': 'Notice Issued',
                  };
                  handleStepClick(nexts[alert.status]);
                }}
                className="px-3 py-1.5 rounded-lg bg-neon/15 border border-neon/30 text-neon font-mono text-xs hover:bg-neon/25 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                Advance Status
              </button>
            </div>

            <div className="flex items-center gap-2">
              {caseCreated ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-neon font-bold">
                    Ref: {caseCreated.ref}
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={loadingAction}
                    className="px-3 py-1.5 rounded-lg bg-cyan/20 border border-cyan/40 text-cyan font-mono text-xs hover:bg-cyan/30 transition-all flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Download FIR PDF
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateCase}
                  disabled={loadingAction}
                  className="px-3.5 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white font-mono text-xs hover:bg-white/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <FileText className="w-3.5 h-3.5 text-neon" />
                  Initiate Formal Case & Ledger
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
