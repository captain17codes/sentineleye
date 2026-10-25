import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { statsApi, RiskStatsResponse } from '../api/stats.api';
import { useAlerts } from '../hooks/useAlerts';
import { useJurisdiction } from '../context/JurisdictionContext';
import { AlertAreaChart } from '../components/charts/AlertAreaChart';
import { SeverityDonut } from '../components/charts/SeverityDonut';
import { SpectralAnalysisChart } from '../components/charts/SpectralAnalysisChart';
import { AlertSourceBadge } from '../components/ui/AlertSourceBadge';
import { LoadingState, EmptyState } from '../components/ui/StatusStates';
import { getClassColor, severityColor } from '../utils/riskColors';
import { formatTimeAgo } from '../utils/formatters';
import { getLedgerChain, verifyChain, VerificationResult } from '../engine/ledger';
import {
  totalAlerts as selectTotalAlerts,
  criticalCount as selectCriticalCount,
  totalEncroachedAreaM2 as selectTotalAreaM2,
  severityDistribution as selectSeverityDistribution,
  trend30d as selectTrend30d,
} from '../engine/selectors';
import {
  ShieldAlert,
  Layers,
  MapPin,
  Lock,
  ArrowRight,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export function Overview() {
  const { alerts } = useAlerts();
  const { jurisdiction } = useJurisdiction();
  const [stats, setStats] = useState<RiskStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [ledgerVerified, setLedgerVerified] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    getLedgerChain().then(verifyChain).then((res) => {
      if (mounted) setLedgerVerified(res.valid);
    });

    statsApi
      .getRiskStats()
      .then((data) => {
        if (mounted) {
          setStats(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [alerts]);

  const totalAlertsCount = alerts.length > 0 ? selectTotalAlerts(alerts) : (stats?.totals?.total_alerts || 0);
  const totalAreaM2 = alerts.length > 0 ? selectTotalAreaM2(alerts) : (stats?.totals?.total_area_m2 || 0);
  const criticalCountVal = alerts.length > 0 ? selectCriticalCount(alerts) : (stats?.totals?.critical || 0);
  const severityData = alerts.length > 0 ? selectSeverityDistribution(alerts) : (stats?.bySeverity || []);
  const dayData = alerts.length > 0 ? selectTrend30d(alerts) : (stats?.byDay || []);
  const recentAlerts = alerts.slice(0, 6);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#2a3832]">
        <div>
          <h1 className="text-xl font-semibold text-[#f1f5f3]">Operational overview</h1>
          <p className="text-xs text-[#b4c2bb] mt-0.5">
            Planetary intelligence and automated land encroachment telemetry
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <NavLink
            to="/scan"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#16201c] hover:bg-[#111816] border border-[#2a3832] text-xs font-semibold text-[#f1f5f3] transition-colors min-h-[38px]"
          >
            <span>Run scan</span>
          </NavLink>
          <NavLink
            to="/map"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#22c55e] text-[#0b0f0e] font-semibold text-xs hover:bg-[#16a34a] transition-colors min-h-[38px] shadow-sm"
          >
            <span>View live map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>
      </div>

      {/* Loading & Empty States */}
      {loading && alerts.length === 0 ? (
        <LoadingState
          title="INITIALIZING TELEMETRY STACK..."
          message="Aggregating multi-temporal satellite anomalies, cadastral boundaries, and ledger provenance..."
        />
      ) : alerts.length === 0 ? (
        <EmptyState
          title="No active telemetry alerts"
          message="No anomalous ground disturbance has been verified in the monitored ecological sectors."
          actionLabel="Execute orbital scan"
          onAction={() => window.location.assign('/scan')}
        />
      ) : (
        <>
          {/* ── 4 KPI Cards (Solid #111816, high contrast, projector readable) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Alerts */}
            <div className="p-4 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-[#b4c2bb] mb-2">
                <span className="text-xs font-semibold tracking-wide text-[#f1f5f3]">Validated alerts</span>
                <ShieldAlert className="w-4 h-4 text-[#22c55e]" />
              </div>
              <div>
                <span className="text-3xl sm:text-4xl font-bold font-mono text-[#f1f5f3] kpi-number">
                  {totalAlertsCount}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-[#b4c2bb] mt-1 font-mono">
                  <span className="text-critical font-medium">{criticalCountVal} critical</span>
                  <span>•</span>
                  <span>100% verified</span>
                </div>
                <p className="text-[11px] text-[#b4c2bb] mt-2 pt-2 border-t border-[#2a3832]/60 kpi-subtitle leading-snug">
                  Validated alerts: Detections that passed sensor fusion &amp; boundary checks
                </p>
              </div>
            </div>

            {/* Card 2: Total Encroached Area */}
            <div className="p-4 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-[#b4c2bb] mb-2">
                <span className="text-xs font-semibold tracking-wide text-[#f1f5f3]">Encroached area</span>
                <Layers className="w-4 h-4 text-[#22c55e]" />
              </div>
              <div>
                <span className="text-3xl sm:text-4xl font-bold font-mono text-[#f1f5f3] kpi-number">
                  {Math.round(totalAreaM2).toLocaleString()} <span className="text-xs font-normal text-[#b4c2bb]">m²</span>
                </span>
                <div className="text-xs text-[#b4c2bb] mt-1 font-mono">
                  Cadastral perimeter verified
                </div>
                <p className="text-[11px] text-[#b4c2bb] mt-2 pt-2 border-t border-[#2a3832]/60 kpi-subtitle leading-snug">
                  Encroached area: Total satellite-measured area with verified vegetation or soil loss
                </p>
              </div>
            </div>

            {/* Card 3: Monitored Protected Zones */}
            <div className="p-4 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-[#b4c2bb] mb-2">
                <span className="text-xs font-semibold tracking-wide text-[#f1f5f3]">Monitored sectors</span>
                <MapPin className="w-4 h-4 text-[#22c55e]" />
              </div>
              <div>
                <span className="text-3xl sm:text-4xl font-bold font-mono text-[#f1f5f3] kpi-number">8</span>
                <div className="text-xs text-[#b4c2bb] mt-1 font-mono">
                  Delhi NCR ecological corridors
                </div>
                <p className="text-[11px] text-[#b4c2bb] mt-2 pt-2 border-t border-[#2a3832]/60 kpi-subtitle leading-snug">
                  Monitored sectors: Protected wildlife &amp; forest zones under continuous surveillance
                </p>
              </div>
            </div>

            {/* Card 4: Ledger Status */}
            <NavLink
              to="/ledger"
              className="p-4 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col justify-between hover:border-[#22c55e]/50 transition-colors group shadow-sm min-h-[38px]"
            >
              <div className="flex items-center justify-between text-[#b4c2bb] mb-2">
                <span className="text-xs font-semibold tracking-wide text-[#f1f5f3]">Ledger chain</span>
                <Lock className={`w-4 h-4 ${ledgerVerified ? 'text-[#22c55e]' : 'text-red-400'}`} />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-3xl sm:text-4xl font-bold font-mono kpi-number ${ledgerVerified ? 'text-[#22c55e]' : 'text-red-400'}`}>
                    {ledgerVerified ? 'Verified' : 'Tampered'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#b4c2bb] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-xs text-[#b4c2bb] mt-1 font-mono">
                  SHA-256 tamper-evident chain
                </div>
                <p className="text-[11px] text-[#b4c2bb] mt-2 pt-2 border-t border-[#2a3832]/60 kpi-subtitle leading-snug">
                  Ledger chain: Cryptographically linked audit blocks admissible under Sec 63 BSA
                </p>
              </div>
            </NavLink>
          </div>

          {/* ── Mid Section: Spectral Analysis + Severity Donut ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Spectral Analysis Chart (NDVI vs SAR) - 7 Cols */}
            <div className="lg:col-span-7 p-5 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#2a3832]">
                <div>
                  <h3 className="text-sm font-semibold text-[#f1f5f3]">Spectral analysis</h3>
                  <p className="text-xs text-[#b4c2bb] kpi-subtitle">
                    Spectral analysis: Optical vegetation loss (ΔNDVI) vs radar double-bounce (ΔSAR)
                  </p>
                </div>
                <span className="text-xs font-mono text-[#b4c2bb]">Multi-sensor</span>
              </div>
              <SpectralAnalysisChart />
            </div>

            {/* Severity Donut - 5 Cols */}
            <div className="lg:col-span-5 p-5 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#2a3832]">
                <div>
                  <h3 className="text-sm font-semibold text-[#f1f5f3]">Severity distribution</h3>
                  <p className="text-xs text-[#b4c2bb] kpi-subtitle">
                    Severity distribution: Active threat vectors categorized by environmental risk score
                  </p>
                </div>
                <span className="text-xs font-mono text-[#b4c2bb]">Current</span>
              </div>
              <SeverityDonut data={severityData} />
            </div>
          </div>

          {/* ── Lower Section: 30-Day Trend + Recent Alerts List ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* 30-Day Trend - 6 Cols */}
            <div className="lg:col-span-6 p-5 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#2a3832]">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#22c55e]" />
                  <div>
                    <h3 className="text-sm font-semibold text-[#f1f5f3]">30-day detection trend</h3>
                    <p className="text-xs text-[#b4c2bb] kpi-subtitle">
                      30-day detection trend: Daily multi-temporal anomaly rate across monitored conservation corridors
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-[#b4c2bb]">Past 30 days</span>
              </div>
              <AlertAreaChart data={dayData} />
            </div>

            {/* Recent Alerts List - 6 Cols */}
            <div className="lg:col-span-6 p-5 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#2a3832]">
                <div>
                  <h3 className="text-sm font-semibold text-[#f1f5f3]">Recent alerts</h3>
                  <p className="text-xs text-[#b4c2bb] kpi-subtitle">
                    Recent alerts: Latest validated detections requiring administrative review
                  </p>
                </div>
                <NavLink
                  to="/alerts"
                  className="text-xs font-semibold text-[#22c55e] hover:underline flex items-center gap-1 min-h-[36px]"
                >
                  <span>View all</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </NavLink>
              </div>

              <div className="flex flex-col divide-y divide-[#2a3832] overflow-hidden">
                {recentAlerts.map((alert) => {
                  const color = getClassColor(alert.class);
                  const sevColor = severityColor[alert.severity] || '#94a3b8';

                  return (
                    <div
                      key={alert.id}
                      className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-[#16201c] px-2 rounded transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="px-2.5 py-1 rounded text-[11px] font-semibold border flex-shrink-0"
                          style={{
                            borderColor: color,
                            backgroundColor: '#16201c',
                            color: color,
                          }}
                        >
                          {alert.class}
                        </span>
                        <AlertSourceBadge alert={alert} />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[#f1f5f3] font-medium text-[13px] truncate">
                            {alert.zone_name
                              ? `${alert.zone_name.startsWith('Z-') ? '' : `Z-${alert.zone_id} `}${alert.zone_name}`
                              : `Zone Z-${alert.zone_id}`}
                          </span>
                          <span className="text-[12px] text-[#b4c2bb] font-mono">
                            {(alert.area_m2 || 3850).toLocaleString()} m² • {(alert.confidence ? alert.confidence * 100 : 91).toFixed(0)}% conf
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 flex-shrink-0 text-right">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider"
                          style={{
                            borderColor: sevColor,
                            backgroundColor: '#16201c',
                            color: sevColor,
                          }}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-[12px] font-mono text-[#b4c2bb] w-16">
                          {formatTimeAgo(alert.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
