import React, { useState } from 'react';
import { Alert } from '../../types/alert.types';
import { AlertSourceBadge } from '../ui/AlertSourceBadge';
import { severityColor } from '../../utils/riskColors';
import { formatTimeAgo } from '../../utils/formatters';
import {
  ChevronLeft,
  ChevronRight,
  Radio,
  Terminal,
} from 'lucide-react';

interface SurveillanceFeedProps {
  alerts: Alert[];
  selectedAlertId: number | null;
  onSelectAlert: (alert: Alert) => void;
}

const TELEMETRY_LOGS = [
  { time: '14:22:05', msg: 'Sentinel-2 MSI model pass complete' },
  { time: '14:21:48', msg: 'Bitemporal SAR coherence matrix calibrated' },
  { time: '14:20:12', msg: 'Zone intersection validated against cadastral boundary' },
  { time: '14:18:30', msg: 'Atmospheric cloud suppression applied (88% clear)' },
  { time: '14:15:00', msg: 'Ledger block validated via SHA-256 state tree' },
];

export function SurveillanceFeed({
  alerts,
  selectedAlertId,
  onSelectAlert,
}: SurveillanceFeedProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'alerts' | 'telemetry'>('alerts');

  return (
    <div
      className={`absolute top-4 left-4 z-20 flex transition-all duration-300 select-none ${
        collapsed ? 'w-10' : 'w-[360px]'
      }`}
    >
      <div className="relative w-full rounded-lg bg-[#121212] border border-[#2e2e2e] flex flex-col shadow-[0_4px_16px_rgba(0,0,0,0.4)] overflow-hidden max-h-[calc(100vh-140px)]">
        {/* Header */}
        <div className="h-11 px-3.5 bg-[#1a1a1a] border-b border-[#2e2e2e] flex items-center justify-between flex-shrink-0">
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <span className="live-dot" />
              <span className="text-xs font-semibold text-[#f5f5f0]">Surveillance feed</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#121212] border border-[#2e2e2e] text-[#facc15] font-semibold">
                {alerts.length}
              </span>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <Radio className="w-4 h-4 text-[#facc15]" />
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded text-[#b5b5ad] hover:text-[#f5f5f0] hover:bg-[#121212] transition-colors"
            title={collapsed ? 'Expand feed' : 'Collapse feed'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {!collapsed && (
          <>
            {/* Tabs (active tab white with green underline, inactive #b5b5ad) */}
            <div className="flex border-b border-[#2e2e2e] text-xs font-medium">
              <button
                onClick={() => setActiveTab('alerts')}
                className={`flex-1 py-2 text-center transition-colors border-b-2 ${
                  activeTab === 'alerts'
                    ? 'text-[#f5f5f0] font-semibold border-[#facc15] bg-[#1a1a1a]'
                    : 'text-[#b5b5ad] border-transparent hover:text-[#f5f5f0] bg-[#121212]'
                }`}
              >
                Alerts ({alerts.length})
              </button>
              <button
                onClick={() => setActiveTab('telemetry')}
                className={`flex-1 py-2 text-center transition-colors border-b-2 ${
                  activeTab === 'telemetry'
                    ? 'text-[#f5f5f0] font-semibold border-[#facc15] bg-[#1a1a1a]'
                    : 'text-[#b5b5ad] border-transparent hover:text-[#f5f5f0] bg-[#121212]'
                }`}
              >
                Telemetry logs
              </button>
            </div>

            {/* Tab 1: Alerts List */}
            {activeTab === 'alerts' && (
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2 bg-[#121212]">
                {alerts.length === 0 ? (
                  <div className="p-5 text-center text-xs text-[#b5b5ad]">
                    No active alerts in this jurisdiction
                  </div>
                ) : (
                  alerts.map((alert) => {
                    const isSelected = selectedAlertId === alert.id;
                    const sevColor = severityColor[alert.severity] || '#64748b';
                    const areaFormatted = (alert.area_m2 || 3850).toLocaleString();
                    const timeFormatted = formatTimeAgo(alert.created_at);

                    return (
                      <div
                        key={alert.id}
                        onClick={() => onSelectAlert(alert)}
                        className={`p-3 rounded-md border text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#1a1a1a] border-[#2e2e2e] border-l-[3px] border-l-[#facc15]'
                            : 'bg-[#121212] border-[#2e2e2e] hover:bg-[#1a1a1a]'
                        }`}
                      >
                        {/* Line 1: class name in white (Inter 14px semibold) + source badge + severity badge */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-semibold text-[14px] text-[#f5f5f0] truncate font-sans">
                              {alert.class}
                            </span>
                            <AlertSourceBadge alert={alert} />
                          </div>
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex-shrink-0 tracking-wider"
                            style={{
                              borderColor: sevColor,
                              backgroundColor: '#1a1a1a',
                              color: sevColor,
                            }}
                          >
                            {alert.severity}
                          </span>
                        </div>

                        {/* Line 2: zone name in #b5b5ad (13px) */}
                        <div className="text-[13px] text-[#b5b5ad] truncate mb-1">
                          {alert.zone_name
                            ? `${alert.zone_name.startsWith('Z-') ? '' : `Z-${alert.zone_id} • `}${alert.zone_name}`
                            : `Zone Z-${alert.zone_id}`}
                        </div>

                        {/* Line 3: mono 12px "1,200 m² · New · 46m ago" in #8f8f86 */}
                        <div className="font-mono text-[12px] text-[#8f8f86]">
                          {areaFormatted} m² · {alert.status} · {timeFormatted}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Tab 2: Telemetry Log */}
            {activeTab === 'telemetry' && (
              <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] space-y-2.5 text-[#b5b5ad] bg-[#121212]">
                <div className="flex items-center gap-1.5 text-[#facc15] text-[11px] pb-1.5 border-b border-[#2e2e2e] font-semibold">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Real-time orbital feed</span>
                </div>
                {TELEMETRY_LOGS.map((log, i) => (
                  <div key={i} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-[#8f8f86] text-[10px] flex-shrink-0">{log.time}</span>
                    <span className="text-[#f5f5f0]">{log.msg}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
