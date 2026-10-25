import React, { useState, useEffect, useMemo } from 'react';
import { statsApi, RiskStatsResponse } from '../api/stats.api';
import { AlertAreaChart } from '../components/charts/AlertAreaChart';
import { RiskBarChart } from '../components/charts/RiskBarChart';
import { SeverityDonut } from '../components/charts/SeverityDonut';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2a3832]">
        <div>
          <h1 className="text-xl font-semibold text-[#f1f5f3]">Risk analytics & threat indices</h1>
          <p className="text-xs text-[#b4c2bb] mt-0.5">
            Aggregated spatial encroachment metrics, incident velocity, and sector exposure
          </p>
        </div>

        {/* Sector Filter Dropdown (Solid #0b0f0e) */}
        <div className="flex items-center gap-2.5">
          <label htmlFor="sector-filter" className="text-xs text-[#b4c2bb] font-medium whitespace-nowrap">
            Filter sector:
          </label>
          <select
            id="sector-filter"
            value={selectedZoneFilter}
            onChange={(e) => setSelectedZoneFilter(e.target.value)}
            className="bg-[#0b0f0e] border border-[#2a3832] text-[#f1f5f3] rounded-md px-3 py-1.5 text-xs focus:outline-none focus:border-[#22c55e] focus:ring-2 focus:ring-[#22c55e] cursor-pointer"
            style={{ backgroundColor: '#0b0f0e', color: '#f1f5f3' }}
          >
            <option value="all" style={{ backgroundColor: '#0b0f0e', color: '#f1f5f3' }}>All ecological sectors</option>
            {stats?.byZone?.map((z) => (
              <option key={z.id} value={String(z.id)} style={{ backgroundColor: '#0b0f0e', color: '#f1f5f3' }}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Aggregate KPI Cards (Solid #111816, high-contrast) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="p-4 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#b4c2bb] mb-2">
            <span className="text-xs font-medium">Total intercepts</span>
            <AlertOctagon className="w-4 h-4 text-[#22c55e]" />
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-[#f1f5f3]">
              {totalCount}
            </span>
            <div className="text-[12px] text-[#b4c2bb] mt-1">Cumulative records</div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-4 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#b4c2bb] mb-2">
            <span className="text-xs font-medium">Critical threats</span>
            <span className="w-2.5 h-2.5 rounded-full bg-critical" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold font-mono text-[#f1f5f3]">
                {critical}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#16201c] border border-critical text-critical uppercase">
                Critical
              </span>
            </div>
            <div className="text-[12px] text-[#b4c2bb] mt-1">Immediate action required</div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-4 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#b4c2bb] mb-2">
            <span className="text-xs font-medium">Verified cases</span>
            <CheckCircle className="w-4 h-4 text-[#22c55e]" />
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-[#f1f5f3]">
              {verified}
            </span>
            <div className="text-[12px] text-[#b4c2bb] mt-1">Confirmed spectral violations</div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="p-4 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#b4c2bb] mb-2">
            <span className="text-xs font-medium">Notices issued</span>
            <TrendingUp className="w-4 h-4 text-[#22c55e]" />
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-[#f1f5f3]">
              {noticeIssued}
            </span>
            <div className="text-[12px] text-[#b4c2bb] mt-1">Enforcement actions</div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Incident Velocity (8 cols) */}
        <div className="lg:col-span-8 p-5 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#2a3832]">
            <div>
              <h3 className="text-sm font-semibold text-[#f1f5f3]">30-day incident velocity</h3>
              <p className="text-xs text-[#b4c2bb]">Daily anomaly detection rate across all monitored corridors</p>
            </div>
          </div>
          <AlertAreaChart data={alerts.length > 0 ? trend30d(alerts) : (stats?.byDay || [])} />
        </div>

        {/* Severity Breakdown (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#2a3832]">
            <div>
              <h3 className="text-sm font-semibold text-[#f1f5f3]">Severity distribution</h3>
              <p className="text-xs text-[#b4c2bb]">Threat level classification</p>
            </div>
          </div>
          <SeverityDonut data={alerts.length > 0 ? severityDistribution(alerts) : (stats?.bySeverity || [])} />
        </div>
      </div>

      {/* Sector Risk Score Bar Chart */}
      <div className="p-5 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#2a3832]">
          <div>
            <h3 className="text-sm font-semibold text-[#f1f5f3]">Vulnerability index by ecological sector</h3>
            <p className="text-xs text-[#b4c2bb]">
              Computed threat exposure based on weighted severity scores
            </p>
          </div>
        </div>
        <RiskBarChart data={filteredZones} />
      </div>
    </div>
  );
}
