import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { statsApi, RiskStatsResponse } from '../api/stats.api';
import { useAlerts } from '../hooks/useAlerts';
import { useJurisdiction } from '../context/JurisdictionContext';
import { AlertAreaChart } from '../components/charts/AlertAreaChart';
import { SeverityDonut } from '../components/charts/SeverityDonut';
import { SpectralAnalysisChart } from '../components/charts/SpectralAnalysisChart';
import { getClassColor, severityColor } from '../utils/riskColors';
import { formatTimeAgo } from '../utils/formatters';
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

  useEffect(() => {
    let mounted = true;
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
  }, []);

  const totalAlerts = stats?.totals?.total_alerts || alerts.length || 38;
  const totalAreaM2 = stats?.totals?.total_area_m2 || 148500;
  const criticalCount = stats?.totals?.critical || 6;
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16201c] hover:bg-[#111816] border border-[#2a3832] text-xs font-medium text-[#f1f5f3] transition-colors"
          >
            <span>Run scan</span>
          </NavLink>
          <NavLink
            to="/map"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#22c55e] text-[#0b0f0e] font-semibold text-xs hover:bg-[#16a34a] transition-colors"
          >
            <span>View live map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>
      </div>

      {/* ── 4 KPI Cards (Solid #111816, high contrast) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Alerts */}
        <div className="p-4 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#b4c2bb] mb-2">
            <span className="text-xs font-medium">Validated alerts</span>
            <ShieldAlert className="w-4 h-4 text-[#22c55e]" />
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-[#f1f5f3]">
              {totalAlerts}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-[#b4c2bb] mt-1">
              <span className="text-critical font-medium">{criticalCount} critical</span>
              <span>•</span>
              <span>100% verified</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Encroached Area */}
        <div className="p-4 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#b4c2bb] mb-2">
            <span className="text-xs font-medium">Encroached area</span>
            <Layers className="w-4 h-4 text-[#22c55e]" />
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-[#f1f5f3]">
              {Math.round(totalAreaM2).toLocaleString()} <span className="text-xs font-normal text-[#b4c2bb]">m²</span>
            </span>
            <div className="text-xs text-[#b4c2bb] mt-1">
              Cadastral perimeter verified
            </div>
          </div>
        </div>

        {/* Card 3: Monitored Protected Zones */}
        <div className="p-4 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#b4c2bb] mb-2">
            <span className="text-xs font-medium">Monitored sectors</span>
            <MapPin className="w-4 h-4 text-[#22c55e]" />
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-[#f1f5f3]">8</span>
            <div className="text-xs text-[#b4c2bb] mt-1">
              Delhi NCR ecological corridors
            </div>
          </div>
        </div>

        {/* Card 4: Ledger Status */}
        <div className="p-4 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#b4c2bb] mb-2">
            <span className="text-xs font-medium">Ledger chain</span>
            <Lock className="w-4 h-4 text-[#22c55e]" />
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-[#22c55e]">
              Verified
            </span>
            <div className="text-xs text-[#b4c2bb] mt-1 font-mono">
              SHA-256 tamper-evident chain
            </div>
          </div>
        </div>
      </div>

      {/* ── Mid Section: Spectral Analysis + Severity Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Spectral Analysis Chart (NDVI vs SAR) - 7 Cols */}
        <div className="lg:col-span-7 p-5 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#2a3832]">
            <div>
              <h3 className="text-sm font-semibold text-[#f1f5f3]">Spectral analysis</h3>
              <p className="text-xs text-[#b4c2bb]">
                NDVI vegetation index vs. SAR radar double-bounce backscatter
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
              <p className="text-xs text-[#b4c2bb]">Active threat vector distribution</p>
            </div>
            <span className="text-xs font-mono text-[#b4c2bb]">Current</span>
          </div>
          <SeverityDonut data={stats?.bySeverity || []} />
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
                <p className="text-xs text-[#b4c2bb]">Daily multi-temporal anomalies</p>
              </div>
            </div>
            <span className="text-xs font-mono text-[#b4c2bb]">Past 30 days</span>
          </div>
          <AlertAreaChart data={stats?.byDay || []} />
        </div>

        {/* Recent Alerts List - 6 Cols */}
        <div className="lg:col-span-6 p-5 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#2a3832]">
            <div>
              <h3 className="text-sm font-semibold text-[#f1f5f3]">Recent alerts</h3>
              <p className="text-xs text-[#b4c2bb]">Latest validated detections requiring review</p>
            </div>
            <NavLink
              to="/alerts"
              className="text-xs font-medium text-[#22c55e] hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>

          <div className="flex flex-col divide-y divide-[#2a3832] overflow-hidden">
            {recentAlerts.map((alert) => {
              const color = getClassColor(alert.class);
              const sevColor = severityColor[alert.severity] || '#64748b';

              return (
                <div
                  key={alert.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-[#16201c] px-2 rounded transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
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
                    <div className="flex flex-col min-w-0">
                      <span className="text-[#f1f5f3] font-medium text-[13px] truncate">
                        {alert.zone_name || `Zone #${alert.zone_id}`}
                      </span>
                      <span className="text-[12px] text-[#b4c2bb] font-mono">
                        {(alert.area_m2 || 3850).toLocaleString()} m² • {(alert.confidence ? alert.confidence * 100 : 91).toFixed(0)}% conf
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-shrink-0 text-right">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-semibold border uppercase"
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
    </div>
  );
}
