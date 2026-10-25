import { Alert } from '../../types/alert.types';
import { Badge } from '../ui/Badge';
import { SimulationBadge } from '../ui/SimulationBadge';
import { casesApi } from '../../api/cases.api';
import { useState } from 'react';
import { FileText, MapPin, Calendar } from 'lucide-react';

interface AlertPopupProps {
  alert: Alert;
  onCaseCreated?: (caseId: number) => void;
}

export function AlertPopup({ alert, onCaseCreated }: AlertPopupProps) {
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  const handleCreateCase = async () => {
    try {
      setLoading(true);
      const res: any = await casesApi.create({ alert_id: alert.id, notes: 'Initiated from GIS Map Layer' });
      setCreated(res.case_ref);
      if (onCaseCreated) onCaseCreated(res.id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-1 font-mono text-xs max-w-xs text-white">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
        <Badge severity={alert.severity} size="xs" />
        <span className="text-[10px] text-muted">ID #{alert.id}</span>
      </div>

      <div className="font-bold text-sm text-neon">
        {alert.zone_name
          ? `${alert.zone_name.startsWith('Z-') ? '' : `Z-${alert.zone_id} • `}${alert.zone_name}`
          : `Zone Z-${alert.zone_id}`}
      </div>

      <div className="text-[11px] text-muted flex flex-col gap-0.5">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-cyan" />
          {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {new Date(alert.created_at).toLocaleString()}
        </span>
      </div>

      <p className="text-[11px] text-white/80 bg-white/5 p-2 rounded border border-white/5 my-1">
        {alert.description}
      </p>

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
        <SimulationBadge size="xs" />
        {created ? (
          <span className="text-neon text-[10px] font-bold">Case: {created}</span>
        ) : (
          <button
            type="button"
            onClick={handleCreateCase}
            disabled={loading}
            className="px-2.5 py-1 rounded bg-neon/20 hover:bg-neon/30 text-neon border border-neon/40 text-[10px] font-bold flex items-center gap-1 disabled:opacity-50"
          >
            <FileText className="w-3 h-3" />
            File Case
          </button>
        )}
      </div>
    </div>
  );
}
