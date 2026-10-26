import React, { useState, useEffect, useMemo } from 'react';
import { statsApi, RiskStatsResponse } from '../api/stats.api';
import { AlertAreaChart } from '../components/charts/AlertAreaChart';
import { RiskBarChart } from '../components/charts/RiskBarChart';
import { SeverityDonut } from '../components/charts/SeverityDonut';
import { LoadingState, EmptyState } from '../components/ui/StatusStates';
import { AlertOctagon, TrendingUp, ShieldAlert, CheckCircle } from 'lucide-react';
import { useAlerts } from '../hooks/useAlerts';
import {
  totalAlerts,
  criticalCount,
  countByStatus,
  severityDistribution,
  trend30d,
  alertsByZone,
} from '../engine/selectors';
import { SEEDED_ZONES } from '../api/seededData';

export function Risk() {
  const { alerts } = useAlerts();
  const [stats, setStats] = useState<RiskStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('all');

  useEffect(() => {
    statsApi
      .getRiskStats()
      .then((data) => setStats(data))
      .catch((err) => console.error('Failed to load risk statistics', err))
      .finally(() => setLoading(false));
  }, [alerts]);

  const totalCount = alerts.length > 0 ? totalAlerts(alerts) : (stats?.totals?.total_alerts ?? 0);
  const critical = alerts.length > 0 ? criticalCount(alerts) : (stats?.totals?.critical ?? 0);
  const verified = alerts.length > 0 ? countByStatus(alerts, 'Verified') : (stats?.totals?.verified ?? 0);
  const noticeIssued = alerts.length > 0 ? countByStatus(alerts, 'Notice Issued') : (stats?.totals?.notice_issued ?? 0);

  const zonesData = alerts.length > 0 ? alertsByZone(alerts, SEEDED_ZONES) : (stats?.byZone || []);

  // Filtered zone stats if user filters by zone
  const filteredZones = useMemo(() => {
    if (!zonesData) return [];
    if (selectedZoneFilter === 'all') return zonesData;
    return zonesData.filter((z) => String(z.id) === selectedZoneFilter);
  }, [zonesData, selectedZoneFilter]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Page Header with Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222c3d]">
        <div>
          <h1 className="text-xl font-semibold text-[#e6eaf0]">Risk by zone</h1>
          <p className="text-xs text-[#98a2b3] mt-0.5">
            Which protected zones have the most alerts, and how fast new ones are appearing
          </p>
        </div>

        {/* Sector Filter Dropdown (Solid #0b1018) */}
        <div className="flex items-center gap-2.5">
          <label htmlFor="sector-filter" className="text-xs text-[#98a2b3] font-medium whitespace-nowrap">
            Filter sector:
          </label>
          <select
            id="sector-filter"
            value={selectedZoneFilter}
            onChange={(e) => setSelectedZoneFilter(e.target.value)}
            className="bg-[#0b1018] border border-[#222c3d] text-[#e6eaf0] rounded-md px-3 py-1.5 text-xs focus:outline-none focus:border-[#facc15]/40 focus:ring-1 focus:ring-[#facc15]/40 cursor-pointer"
            style={{ backgroundColor: '#0b1018', color: '#e6eaf0' }}
          >
            <option value="all" style={{ backgroundColor: '#0b1018', color: '#e6eaf0' }}>All ecological sectors</option>
            {stats?.byZone?.map((z) => (
              <option key={z.id} value={String(z.id)} style={{ backgroundColor: '#0b1018', color: '#e6eaf0' }}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <LoadingState
          title="CALCULATING VULNERABILITY INDICES..."
          message="Aggregating spatial change rates, threat velocities, and sector risk profiles..."
        />
      ) : (
        <>
          {/* Aggregate KPI Cards (Solid #111826, high-contrast, projector readable) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Card 1: Total Intercepts */}
            <div className="p-4 rounded-lg bg-[#111826] border border-[#222c3d] flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-[#98a2b3] mb-2">
                <span className="text-xs font-semibold text-[#e6eaf0]">All alerts</span>
                <AlertOctagon className="w-4 h-4 text-[#facc15]" />
              </div>
              <div>
                <span className="text-3xl sm:text-4xl font-semibold text-[#e6eaf0] kpi-number">
                  {totalCount}
                </span>
                <div className="text-[12px] text-[#98a2b3] mt-1 font-mono">Cumulative records</div>
                <p className="text-[11px] text-[#98a2b3] mt-2 pt-2 border-t border-[#222c3d]/60 kpi-subtitle leading-snug">
                  Every change found so far across all zones
                </p>
              </div>
            </div>

            {/* Card 2: Critical Threats */}
            <div className="p-4 rounded-lg bg-[#111826] border border-[#222c3d] flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-[#98a2b3] mb-2">
                <span className="text-xs font-semibold text-[#e6eaf0]">Critical threats</span>
                <span className="w-2.5 h-2.5 rounded-full bg-critical" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl sm:text-4xl font-semibold text-critical kpi-number">
                    {critical}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#172031] border border-critical text-critical uppercase tracking-wider">
                    Critical
                  </span>
                </div>
                <div className="text-[12px] text-[#98a2b3] mt-1 font-mono">Immediate action required</div>
                <p className="text-[11px] text-[#98a2b3] mt-2 pt-2 border-t border-[#222c3d]/60 kpi-subtitle leading-snug">
                  Large or very sensitive changes to check first
                </p>
              </div>
            </div>

            {/* Card 3: Verified Cases */}
            <div className="p-4 rounded-lg bg-[#111826] border border-[#222c3d] flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-[#98a2b3] mb-2">
                <span className="text-xs font-semibold text-[#e6eaf0]">Verified cases</span>
                <CheckCircle className="w-4 h-4 text-[#facc15]" />
              </div>
              <div>
                <span className="text-3xl sm:text-4xl font-semibold text-[#eef2f7] kpi-number">
                  {verified}
                </span>
                <div className="text-[12px] text-[#98a2b3] mt-1 font-mono">Confirmed spectral violations</div>
                <p className="text-[11px] text-[#98a2b3] mt-2 pt-2 border-t border-[#222c3d]/60 kpi-subtitle leading-snug">
                  Checked by an officer and confirmed
                </p>
              </div>
            </div>

            {/* Card 4: Notices Issued */}
            <div className="p-4 rounded-lg bg-[#111826] border border-[#222c3d] flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-[#98a2b3] mb-2">
                <span className="text-xs font-semibold text-[#e6eaf0]">Notices issued</span>
                <TrendingUp className="w-4 h-4 text-[#facc15]" />
              </div>
              <div>
                <span className="text-3xl sm:text-4xl font-semibold text-[#e6eaf0] kpi-number">
                  {noticeIssued}
                </span>
                <div className="text-[12px] text-[#98a2b3] mt-1 font-mono">Enforcement actions</div>
                <p className="text-[11px] text-[#98a2b3] mt-2 pt-2 border-t border-[#222c3d]/60 kpi-subtitle leading-snug">
                  Alerts with a legal notice drafted or served
                </p>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Incident Velocity (8 cols) */}
            <div className="lg:col-span-8 p-5 rounded-lg bg-[#111826] border border-[#222c3d] flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#222c3d]">
                <div>
                  <h3 className="text-sm font-semibold text-[#e6eaf0]">30-day incident velocity</h3>
                  <p className="text-xs text-[#98a2b3] kpi-subtitle">
                    New alerts found each day
                  </p>
                </div>
              </div>
              <AlertAreaChart data={alerts.length > 0 ? trend30d(alerts) : (stats?.byDay || [])} />
            </div>

            {/* Severity Breakdown (4 cols) */}
            <div className="lg:col-span-4 p-5 rounded-lg bg-[#111826] border border-[#222c3d] flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#222c3d]">
                <div>
                  <h3 className="text-sm font-semibold text-[#e6eaf0]">Severity distribution</h3>
                  <p className="text-xs text-[#98a2b3] kpi-subtitle">
                    How serious the alerts are
                  </p>
                </div>
              </div>
              <SeverityDonut data={alerts.length > 0 ? severityDistribution(alerts) : (stats?.bySeverity || [])} />
            </div>
          </div>

          {/* Sector Risk Score Bar Chart */}
          <div className="p-5 rounded-lg bg-[#111826] border border-[#222c3d] flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#222c3d]">
              <div>
                <h3 className="text-sm font-semibold text-[#e6eaf0]">Vulnerability index by ecological sector</h3>
                <p className="text-xs text-[#98a2b3] kpi-subtitle">
                  Which zones have the most serious alerts (critical counts more than low)
                </p>
              </div>
            </div>
            <RiskBarChart data={filteredZones} />
          </div>
        </>
      )}
    </div>
  );
}
