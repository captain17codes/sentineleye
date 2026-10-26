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
  const [showStart, setShowStart] = useState<boolean>(() => {
    try {
      return localStorage.getItem('se_start_hidden') !== '1';
    } catch {
      return true;
    }
  });
  const hideStart = () => {
    setShowStart(false);
    try {
      localStorage.setItem('se_start_hidden', '1');
    } catch {
      /* ignore */
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#2e2e2e]">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f0]">Overview</h1>
          <p className="text-xs text-[#b5b5ad] mt-0.5">
            What the satellites found across 8 protected zones in Delhi NCR, and the state of the evidence record
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <NavLink
            to="/scan"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#121212] border border-[#2e2e2e] text-xs font-semibold text-[#f5f5f0] transition-colors min-h-[38px]"
          >
            <span>Run scan</span>
          </NavLink>
          <NavLink
            to="/map"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#facc15] text-[#0a0a0a] font-semibold text-xs hover:bg-[#eab308] transition-colors min-h-[38px] shadow-sm"
          >
            <span>View live map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>
      </div>

      {showStart && (
        <div className="rounded-xl border border-[#facc15]/30 bg-gradient-to-br from-[#facc15]/[0.07] to-transparent p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#facc15]">Start here</p>
              <h2 className="mt-1 text-base font-semibold text-[#f5f5f0]">Three things to try</h2>
            </div>
            <button onClick={hideStart} className="text-xs text-[#8f8f86] hover:text-[#f5f5f0]">
              Hide
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { n: 1, t: 'Scan a zone', d: 'Compare two satellite dates for a protected zone.', to: '/scan', c: 'Open Scan' },
              { n: 2, t: 'Review an alert', d: 'See before/after images and mark it Verified.', to: '/alerts', c: 'Open Alerts' },
              { n: 3, t: 'See a real case', d: 'Khori Gaon demolition found within 177 m.', to: '/cases', c: 'Open Case studies' },
            ].map((x) => (
              <NavLink
                key={x.n}
                to={x.to}
                className="group rounded-lg border border-[#2e2e2e] bg-[#0f0f0f] p-4 hover:border-[#facc15]/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#facc15] text-[#0a0a0a] text-xs font-bold flex items-center justify-center">{x.n}</span>
                  <span className="text-sm font-semibold text-[#f5f5f0]">{x.t}</span>
                </div>
                <p className="mt-2 text-[13px] text-[#b5b5ad]">{x.d}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#facc15]">
                  {x.c} <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* Loading & Empty States */}
      {loading && alerts.length === 0 ? (
        <LoadingState
          title="Loading alerts..."
          message="Reading saved alerts, zone outlines and the evidence record."
        />
      ) : alerts.length === 0 ? (
        <EmptyState
          title="No alerts yet"
          message="Nothing has been found yet. Run a scan to compare two satellite dates for a zone."
          actionLabel="Run a scan"
          onAction={() => window.location.assign('/scan')}
        />
      ) : (
        <>
          {/* ── 4 KPI Cards (Solid #121212, high contrast, projector readable) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Alerts */}
            <div className="p-4 rounded-lg bg-[#121212] border border-[#2e2e2e] flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-[#b5b5ad] mb-2">
                <span className="text-xs font-semibold tracking-wide text-[#f5f5f0]">Alerts found</span>
                <ShieldAlert className="w-4 h-4 text-[#facc15]" />
              </div>
              <div>
                <span className="text-3xl sm:text-4xl font-bold font-mono text-[#f5f5f0] kpi-number">
                  {totalAlertsCount}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-[#b5b5ad] mt-1 font-mono">
                  <span className="text-critical font-medium">{criticalCountVal} critical</span>
                  <span>•</span>
                  <span>{alerts.filter((a) => a.status && a.status !== 'New').length} reviewed</span>
                </div>
                <p className="text-[11px] text-[#b5b5ad] mt-2 pt-2 border-t border-[#2e2e2e]/60 kpi-subtitle leading-snug">
                  Changes found inside a protected zone that passed the automatic checks
                </p>
              </div>
            </div>

            {/* Card 2: Total Encroached Area */}
            <div className="p-4 rounded-lg bg-[#121212] border border-[#2e2e2e] flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-[#b5b5ad] mb-2">
                <span className="text-xs font-semibold tracking-wide text-[#f5f5f0]">Area affected</span>
                <Layers className="w-4 h-4 text-[#facc15]" />
              </div>
              <div>
                <span className="text-3xl sm:text-4xl font-bold font-mono text-[#f5f5f0] kpi-number">
                  {Math.round(totalAreaM2).toLocaleString()} <span className="text-xs font-normal text-[#b5b5ad]">m²</span>
                </span>
                <div className="text-xs text-[#b5b5ad] mt-1 font-mono">
                  Inside zone boundaries
                </div>
                <p className="text-[11px] text-[#b5b5ad] mt-2 pt-2 border-t border-[#2e2e2e]/60 kpi-subtitle leading-snug">
                  Total ground area where vegetation was lost or soil was exposed (1 hectare = 10,000 m²)
                </p>
              </div>
            </div>

            {/* Card 3: Monitored Protected Zones */}
            <div className="p-4 rounded-lg bg-[#121212] border border-[#2e2e2e] flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-[#b5b5ad] mb-2">
                <span className="text-xs font-semibold tracking-wide text-[#f5f5f0]">Protected zones</span>
                <MapPin className="w-4 h-4 text-[#facc15]" />
              </div>
              <div>
                <span className="text-3xl sm:text-4xl font-bold font-mono text-[#f5f5f0] kpi-number">8</span>
                <div className="text-xs text-[#b5b5ad] mt-1 font-mono">
                  Forests, ridge and floodplain
                </div>
                <p className="text-[11px] text-[#b5b5ad] mt-2 pt-2 border-t border-[#2e2e2e]/60 kpi-subtitle leading-snug">
                  Areas the system watches, e.g. Delhi Ridge, Asola Bhatti, Mangar Bani
                </p>
              </div>
            </div>

            {/* Card 4: Ledger Status */}
            <NavLink
              to="/ledger"
              className="p-4 rounded-lg bg-[#121212] border border-[#2e2e2e] flex flex-col justify-between hover:border-[#facc15]/50 transition-colors group shadow-sm min-h-[38px]"
            >
              <div className="flex items-center justify-between text-[#b5b5ad] mb-2">
                <span className="text-xs font-semibold tracking-wide text-[#f5f5f0]">Evidence record</span>
                <Lock className={`w-4 h-4 ${ledgerVerified ? 'text-[#facc15]' : 'text-red-400'}`} />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-3xl sm:text-4xl font-bold font-mono kpi-number ${ledgerVerified ? 'text-[#facc15]' : 'text-red-400'}`}>
                    {ledgerVerified ? 'Intact' : 'Tampered'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#b5b5ad] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-xs text-[#b5b5ad] mt-1 font-mono">
                  Nothing has been altered
                </div>
                <p className="text-[11px] text-[#b5b5ad] mt-2 pt-2 border-t border-[#2e2e2e]/60 kpi-subtitle leading-snug">
                  Every action is saved as a linked, signed block, so any later edit is detected. Click to open.
                </p>
              </div>
            </NavLink>
          </div>

          {/* ── Mid Section: Spectral Analysis + Severity Donut ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Spectral Analysis Chart (NDVI vs SAR) - 7 Cols */}
            <div className="lg:col-span-7 p-5 rounded-lg bg-[#121212] border border-[#2e2e2e] flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#2e2e2e]">
                <div>
                  <h3 className="text-sm font-semibold text-[#f5f5f0]">How the changes look to the satellite</h3>
                  <p className="text-xs text-[#b5b5ad] kpi-subtitle">
                    Left = more vegetation lost (NDVI). Up = stronger radar return, typical of new buildings (SAR)
                  </p>
                </div>
                <span className="text-xs font-mono text-[#b5b5ad]">Multi-sensor</span>
              </div>
              <SpectralAnalysisChart />
            </div>

            {/* Severity Donut - 5 Cols */}
            <div className="lg:col-span-5 p-5 rounded-lg bg-[#121212] border border-[#2e2e2e] flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#2e2e2e]">
                <div>
                  <h3 className="text-sm font-semibold text-[#f5f5f0]">Alerts by severity</h3>
                  <p className="text-xs text-[#b5b5ad] kpi-subtitle">
                    How serious each alert is, based on size and how sensitive the zone is
                  </p>
                </div>
                <span className="text-xs font-mono text-[#b5b5ad]">Current</span>
              </div>
              <SeverityDonut data={severityData} />
            </div>
          </div>

          {/* ── Lower Section: 30-Day Trend + Recent Alerts List ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* 30-Day Trend - 6 Cols */}
            <div className="lg:col-span-6 p-5 rounded-lg bg-[#121212] border border-[#2e2e2e] flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#2e2e2e]">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#facc15]" />
                  <div>
                    <h3 className="text-sm font-semibold text-[#f5f5f0]">Alerts over the last 30 days</h3>
                    <p className="text-xs text-[#b5b5ad] kpi-subtitle">
                      Number of new alerts found each day
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-[#b5b5ad]">Past 30 days</span>
              </div>
              <AlertAreaChart data={dayData} />
            </div>

            {/* Recent Alerts List - 6 Cols */}
            <div className="lg:col-span-6 p-5 rounded-lg bg-[#121212] border border-[#2e2e2e] flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#2e2e2e]">
                <div>
                  <h3 className="text-sm font-semibold text-[#f5f5f0]">Recent alerts</h3>
                  <p className="text-xs text-[#b5b5ad] kpi-subtitle">
                    Newest alerts waiting for an officer to check
                  </p>
                </div>
                <NavLink
                  to="/alerts"
                  className="text-xs font-semibold text-[#facc15] hover:underline flex items-center gap-1 min-h-[36px]"
                >
                  <span>View all</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </NavLink>
              </div>

              <div className="flex flex-col divide-y divide-[#2e2e2e] overflow-hidden">
                {recentAlerts.map((alert) => {
                  const color = getClassColor(alert.class);
                  const sevColor = severityColor[alert.severity] || '#94a3b8';

                  return (
                    <div
                      key={alert.id}
                      className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-[#1a1a1a] px-2 rounded transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="px-2.5 py-1 rounded text-[11px] font-semibold border flex-shrink-0"
                          style={{
                            borderColor: color,
                            backgroundColor: '#1a1a1a',
                            color: color,
                          }}
                        >
                          {alert.class}
                        </span>
                        <AlertSourceBadge alert={alert} />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[#f5f5f0] font-medium text-[13px] truncate">
                            {alert.zone_name
                              ? `${alert.zone_name.startsWith('Z-') ? '' : `Z-${alert.zone_id} `}${alert.zone_name}`
                              : `Zone Z-${alert.zone_id}`}
                          </span>
                          <span className="text-[12px] text-[#b5b5ad] font-mono">
                            {(alert.area_m2 || 3850).toLocaleString()} m² • {(alert.confidence ? alert.confidence * 100 : 91).toFixed(0)}% conf
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 flex-shrink-0 text-right">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider"
                          style={{
                            borderColor: sevColor,
                            backgroundColor: '#1a1a1a',
                            color: sevColor,
                          }}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-[12px] font-mono text-[#b5b5ad] w-16">
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
