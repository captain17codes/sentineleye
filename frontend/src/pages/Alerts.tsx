import React, { useState, useMemo } from 'react';
import { useAlerts } from '../hooks/useAlerts';
import { alertsApi } from '../api/alerts.api';
import { casesApi } from '../api/cases.api';
import { Alert, AlertStatus } from '../types/alert.types';
import { getClassColor, severityColor } from '../utils/riskColors';
import { formatTimeAgo } from '../utils/formatters';
import { DossierDrawer } from '../components/map/DossierDrawer';
import { downloadNoticePdf } from '../engine/pdfNotice';
import { transitionAlert } from '../engine/clock';
import { AlertSourceBadge } from '../components/ui/AlertSourceBadge';
import { LoadingState, EmptyState } from '../components/ui/StatusStates';
import {
  Search,
  Eye,
  Download,
  ShieldAlert,
  AlertOctagon,
  CheckCircle,
  TrendingUp,
} from 'lucide-react';

const STATUS_FLOW: AlertStatus[] = ['New', 'Verified', 'Notice Issued', 'Signed & Served'];

export function Alerts() {
  const { alerts, loading, refreshAlerts } = useAlerts();

  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [advancingId, setAdvancingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Filtered alerts list
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchSearch =
        search === '' ||
        alert.zone_name?.toLowerCase().includes(search.toLowerCase()) ||
        alert.description?.toLowerCase().includes(search.toLowerCase()) ||
        alert.class?.toLowerCase().includes(search.toLowerCase()) ||
        String(alert.id).includes(search);

      const matchClass = selectedClass === 'all' || alert.class === selectedClass;
      const matchSeverity = selectedSeverity === 'all' || alert.severity === selectedSeverity;
      const matchStatus = selectedStatus === 'all' || alert.status === selectedStatus;

      return matchSearch && matchClass && matchSeverity && matchStatus;
    });
  }, [alerts, search, selectedClass, selectedSeverity, selectedStatus]);

  const handleAdvanceStatus = async (alert: Alert) => {
    const currentIdx = STATUS_FLOW.indexOf(alert.status);
    if (currentIdx === -1 || currentIdx >= STATUS_FLOW.length - 1) return;

    const nextStatus = STATUS_FLOW[currentIdx + 1];
    setAdvancingId(alert.id);
    try {
      await transitionAlert(alert.id, nextStatus);
      refreshAlerts();
    } catch (err: any) {
      console.error(`Status advance failed: ${err.message}`);
    } finally {
      setAdvancingId(null);
    }
  };

  const handleDownloadPdf = async (alert: Alert) => {
    setDownloadingId(alert.id);
    try {
      await downloadNoticePdf(alert);
    } catch (err: any) {
      console.error(`PDF download failed: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const totalCount = alerts.length;
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const verifiedCount = alerts.filter((a) => a.status === 'Verified').length;
  const noticesCount = alerts.filter((a) => a.status === 'Notice Issued' || a.status === 'Signed & Served').length;

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222c3d]">
        <div>
          <h1 className="text-xl font-semibold text-[#e6eaf0]">Alerts</h1>
          <p className="text-xs text-[#98a2b3] mt-0.5">
            Every change the satellites found inside a protected zone. Click a row to see the before/after images.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#98a2b3]">
          <span>All: {alerts.length}</span>
          <span>•</span>
          <span className="text-[#e6eaf0]">Showing: {filteredAlerts.length}</span>
        </div>
      </div>

      {/* ── 4 KPI Summary Cards with One-line Subtitles ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-[#111826] border border-[#222c3d] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#98a2b3] mb-1">
            <span className="text-xs font-semibold text-[#e6eaf0]">All alerts</span>
            <AlertOctagon className="w-4 h-4 text-[#facc15]" />
          </div>
          <span className="text-2xl sm:text-3xl font-semibold text-[#e6eaf0] kpi-number">
            {totalCount}
          </span>
          <p className="text-[11px] text-[#98a2b3] mt-2 pt-2 border-t border-[#222c3d]/60 kpi-subtitle leading-snug">
            Every change found so far, at any stage of review
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[#111826] border border-[#222c3d] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#98a2b3] mb-1">
            <span className="text-xs font-semibold text-[#e6eaf0]">Critical</span>
            <ShieldAlert className="w-4 h-4 text-critical" />
          </div>
          <span className="text-2xl sm:text-3xl font-semibold text-critical kpi-number">
            {criticalCount}
          </span>
          <p className="text-[11px] text-[#98a2b3] mt-2 pt-2 border-t border-[#222c3d]/60 kpi-subtitle leading-snug">
            Large or very sensitive changes that should be checked first
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[#111826] border border-[#222c3d] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#98a2b3] mb-1">
            <span className="text-xs font-semibold text-[#e6eaf0]">Verified</span>
            <CheckCircle className="w-4 h-4 text-[#facc15]" />
          </div>
          <span className="text-2xl sm:text-3xl font-semibold text-[#eef2f7] kpi-number">
            {verifiedCount}
          </span>
          <p className="text-[11px] text-[#98a2b3] mt-2 pt-2 border-t border-[#222c3d]/60 kpi-subtitle leading-snug">
            Checked by an officer and confirmed
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[#111826] border border-[#222c3d] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#98a2b3] mb-1">
            <span className="text-xs font-semibold text-[#e6eaf0]">Notices</span>
            <TrendingUp className="w-4 h-4 text-[#facc15]" />
          </div>
          <span className="text-2xl sm:text-3xl font-semibold text-[#e6eaf0] kpi-number">
            {noticesCount}
          </span>
          <p className="text-[11px] text-[#98a2b3] mt-2 pt-2 border-t border-[#222c3d]/60 kpi-subtitle leading-snug">
            Alerts with a legal notice drafted or served (evidence certificate under Sec 63 BSA)
          </p>
        </div>
      </div>

      {/* ── Filter Controls Bar (Solid #111826 with styled form controls) ── */}
      <div className="p-4 rounded-lg bg-[#111826] border border-[#222c3d] flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-3.5 h-3.5 text-[#98a2b3] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search: zone name, type (e.g. Mining) or alert ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0b1018] border border-[#222c3d] rounded-md pl-8 pr-3 py-2 text-xs text-[#e6eaf0] placeholder-[#98a2b3] focus:outline-none focus:border-[#facc15]/40 focus:ring-1 focus:ring-[#facc15]/40"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            aria-label="Filter by class"
            className="bg-[#0b1018] border border-[#222c3d] text-[#e6eaf0] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#facc15]/40 focus:ring-1 focus:ring-[#facc15]/40 cursor-pointer"
            style={{ backgroundColor: '#0b1018', color: '#e6eaf0' }}
          >
            <option value="all" style={{ backgroundColor: '#0b1018', color: '#e6eaf0' }}>All classes</option>
            <option value="Deforestation" style={{ backgroundColor: '#0b1018', color: '#e6eaf0' }}>Deforestation</option>
            <option value="Unauthorized Construction" style={{ backgroundColor: '#0b1018', color: '#e6eaf0' }}>Unauthorized Construction</option>
            <option value="Mining" style={{ backgroundColor: '#0b1018', color: '#e6eaf0' }}>Mining</option>
            <option value="Land Encroachment" style={{ backgroundColor: '#0b1018', color: '#e6eaf0' }}>Land Encroachment</option>
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            aria-label="Filter by severity"
            className="bg-[#0b1018] border border-[#222c3d] text-[#e6eaf0] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#facc15]/40 focus:ring-1 focus:ring-[#facc15]/40 cursor-pointer"
            style={{ backgroundColor: '#0b1018', color: '#e6eaf0' }}
          >
            <option value="all" style={{ backgroundColor: '#0b1018', color: '#e6eaf0' }}>All severities</option>
            <option value="CRITICAL" style={{ backgroundColor: '#0b1018', color: '#e6eaf0' }}>Critical</option>
            <option value="HIGH" style={{ backgroundColor: '#0b1018', color: '#e6eaf0' }}>High</option>
            <option value="MEDIUM" style={{ backgroundColor: '#0b1018', color: '#e6eaf0' }}>Medium</option>
            <option value="LOW" style={{ backgroundColor: '#0b1018', color: '#e6eaf0' }}>Low</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filter by status"
            className="bg-[#0b1018] border border-[#222c3d] text-[#e6eaf0] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#facc15]/40 focus:ring-1 focus:ring-[#facc15]/40 cursor-pointer"
            style={{ backgroundColor: '#0b1018', color: '#e6eaf0' }}
          >
            <option value="all" style={{ backgroundColor: '#0b1018', color: '#e6eaf0' }}>All statuses</option>
            <option value="New" style={{ backgroundColor: '#0b1018', color: '#e6eaf0' }}>New</option>
            <option value="Verified" style={{ backgroundColor: '#0b1018', color: '#e6eaf0' }}>Verified</option>
            <option value="Notice Issued" style={{ backgroundColor: '#0b1018', color: '#e6eaf0' }}>Notice Drafted</option>
            <option value="Signed & Served" style={{ backgroundColor: '#0b1018', color: '#e6eaf0' }}>Signed & Served</option>
          </select>

          {(search || selectedClass !== 'all' || selectedSeverity !== 'all' || selectedStatus !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedClass('all');
                setSelectedSeverity('all');
                setSelectedStatus('all');
              }}
              className="text-xs text-[#98a2b3] hover:text-[#e6eaf0] px-2 py-1.5 underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <p className="text-[12px] text-[#6f7a8c] -mt-1">
        Review steps: <span className="text-[#e6eaf0]">New</span> → <span className="text-[#e6eaf0]">Verified</span> →{' '}
        <span className="text-[#e6eaf0]">Notice Issued</span> → <span className="text-[#e6eaf0]">Signed &amp; Served</span>. Use the yellow
        button to move an alert one step forward; each step is saved in the evidence record.
      </p>

      {/* ── Compact Alerts Table (Sentence case headers, #98a2b3 12px, cells >= 13px) ── */}
      {loading ? (
        <LoadingState
          title="Loading alerts..."
          message="Reading saved alerts."
        />
      ) : filteredAlerts.length === 0 ? (
        <EmptyState
          title="No alerts match your search"
          message="Try a different word, or clear the filters to see every alert."
          actionLabel="Clear filters"
          onAction={() => {
            setSearch('');
            setSelectedClass('all');
            setSelectedSeverity('all');
            setSelectedStatus('all');
          }}
        />
      ) : (
        <div className="rounded-lg bg-[#111826] border border-[#222c3d] overflow-hidden select-none shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#172031] border-b border-[#222c3d] text-[#98a2b3] text-[12px] font-medium normal-case">
                  <th className="py-3 px-3.5">ID</th>
                  <th className="py-3 px-3.5" title="Real Sentinel-2 image, or the calibration set with known answers">Data</th>
                  <th className="py-3 px-3.5">Type of change</th>
                  <th className="py-3 px-3.5">Zone</th>
                  <th className="py-3 px-3.5">Severity</th>
                  <th className="py-3 px-3.5">Area (m²)</th>
                  <th className="py-3 px-3.5" title="Share of the change that lies inside the zone boundary">Inside zone</th>
                  <th className="py-3 px-3.5" title="New → Verified → Notice Issued → Signed & Served">Review step</th>
                  <th className="py-3 px-3.5">Found</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222c3d]">
                {filteredAlerts.map((alert) => {
                  const color = getClassColor(alert.class);
                  const sevColor = severityColor[alert.severity] || '#94a3b8';
                  const currentIdx = STATUS_FLOW.indexOf(alert.status);
                  const canAdvance = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1;
                  const nextStatus = canAdvance ? STATUS_FLOW[currentIdx + 1] : null;

                  return (
                    <tr
                      key={alert.id}
                      className="hover:bg-[#172031] transition-colors cursor-pointer group"
                      onClick={() => setSelectedAlert(alert)}
                    >
                      {/* ID */}
                      <td className="py-3 px-3.5 font-mono text-[12px] text-[#98a2b3]">
                        #{alert.id}
                      </td>

                      {/* Source: SIMULATED on seeded, REAL on real scene alerts */}
                      <td className="py-3 px-3.5" onClick={(e) => e.stopPropagation()}>
                        <AlertSourceBadge alert={alert} />
                      </td>

                      {/* Class */}
                      <td className="py-3 px-3.5 font-medium">
                        <span className="inline-flex items-center gap-2 whitespace-nowrap text-[13px] text-[#e6eaf0]">
                          <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                          {alert.class}
                        </span>
                      </td>

                      {/* Zone */}
                      <td className="py-3 px-3.5 font-medium text-[#e6eaf0] text-[13px] max-w-[200px] truncate">
                        {alert.zone_name
                          ? `${alert.zone_name.startsWith('Z-') ? '' : `Z-${alert.zone_id} `}${alert.zone_name}`
                          : `Zone Z-${alert.zone_id}`}
                      </td>

                      {/* Severity */}
                      <td className="py-3 px-3.5">
                        <span
                          className="px-2 py-0.5 rounded-md text-[12px] border inline-block capitalize"
                          style={{ borderColor: `${sevColor}55`, backgroundColor: `${sevColor}14`, color: sevColor }}
                        >
                          {alert.severity.toLowerCase()}
                        </span>
                      </td>

                      {/* Area */}
                      <td className="py-3 px-3.5 font-mono text-[13px] text-[#e6eaf0]">
                        {(alert.area_m2 || 3850).toLocaleString()}
                      </td>

                      {/* Overlap */}
                      <td className="py-3 px-3.5 font-mono text-[13px] text-[#e6eaf0]">
                        {alert.overlap_pct || 88.5}%
                      </td>

                      {/* Status Workflow Advance */}
                      <td className="py-3 px-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-mono text-[12px] text-[#98a2b3] whitespace-nowrap">
                            {alert.status}
                          </span>
                          {canAdvance && (
                            <button
                              type="button"
                              onClick={() => handleAdvanceStatus(alert)}
                              disabled={advancingId === alert.id}
                              className="px-3 py-1.5 rounded-md text-xs font-semibold bg-[#172031] hover:bg-[#facc15]/25 border border-[#facc15]/40 text-[#e6eaf0] transition-colors disabled:opacity-50 min-h-[34px] shadow-sm whitespace-nowrap"
                              title={`Move this alert to the next step: ${nextStatus}`}
                            >
                              {advancingId === alert.id ? 'Saving…' : `Mark ${nextStatus}`}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Detected */}
                      <td className="py-3 px-3.5 font-mono text-[12px] text-[#98a2b3] whitespace-nowrap">
                        {formatTimeAgo(alert.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedAlert(alert)}
                            className="p-2 min-h-[36px] min-w-[36px] rounded-lg bg-[#172031] border border-[#222c3d] text-[#98a2b3] hover:text-[#e6eaf0] hover:border-[#facc15]/40 transition-colors flex items-center justify-center"
                            title="Inspect dossier"
                            aria-label="Inspect incident dossier"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(alert)}
                            disabled={downloadingId === alert.id}
                            className="p-2 min-h-[36px] min-w-[36px] rounded-lg bg-[#172031] border border-[#222c3d] text-[#98a2b3] hover:text-[#facc15] hover:border-[#facc15]/40 transition-colors disabled:opacity-50 flex items-center justify-center"
                            title="Download Legal Notice PDF"
                            aria-label="Download Legal Notice PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-in Dossier Drawer */}
      {selectedAlert && (
        <DossierDrawer
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onAlertUpdated={(updated) => {
            setSelectedAlert(updated);
            refreshAlerts();
          }}
        />
      )}
    </div>
  );
}
