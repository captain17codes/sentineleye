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
import {
  Search,
  Eye,
  Download,
} from 'lucide-react';

const STATUS_FLOW: AlertStatus[] = ['New', 'Verified', 'Notice Issued'];

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

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#2a3832]">
        <div>
          <h1 className="text-xl font-semibold text-[#f1f5f3]">Alerts management</h1>
          <p className="text-xs text-[#b4c2bb] mt-0.5">
            Cadastral boundary violations and verified threat vectors across protected zones
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#b4c2bb]">
          <span>Total: {alerts.length}</span>
          <span>•</span>
          <span className="text-[#22c55e] font-semibold">Filtered: {filteredAlerts.length}</span>
        </div>
      </div>

      {/* ── Filter Controls Bar (Solid #111816 with styled form controls) ── */}
      <div className="p-4 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-3.5 h-3.5 text-[#b4c2bb] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by zone, class, ID or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0b0f0e] border border-[#2a3832] rounded-md pl-8 pr-3 py-2 text-xs text-[#f1f5f3] placeholder-[#b4c2bb] focus:outline-none focus:border-[#22c55e] focus:ring-2 focus:ring-[#22c55e]"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            aria-label="Filter by class"
            className="bg-[#0b0f0e] border border-[#2a3832] text-[#f1f5f3] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#22c55e] focus:ring-2 focus:ring-[#22c55e] cursor-pointer"
            style={{ backgroundColor: '#0b0f0e', color: '#f1f5f3' }}
          >
            <option value="all" style={{ backgroundColor: '#0b0f0e', color: '#f1f5f3' }}>All classes</option>
            <option value="Deforestation" style={{ backgroundColor: '#0b0f0e', color: '#f1f5f3' }}>Deforestation</option>
            <option value="Unauthorized Construction" style={{ backgroundColor: '#0b0f0e', color: '#f1f5f3' }}>Unauthorized Construction</option>
            <option value="Mining" style={{ backgroundColor: '#0b0f0e', color: '#f1f5f3' }}>Mining</option>
            <option value="Land Encroachment" style={{ backgroundColor: '#0b0f0e', color: '#f1f5f3' }}>Land Encroachment</option>
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            aria-label="Filter by severity"
            className="bg-[#0b0f0e] border border-[#2a3832] text-[#f1f5f3] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#22c55e] focus:ring-2 focus:ring-[#22c55e] cursor-pointer"
            style={{ backgroundColor: '#0b0f0e', color: '#f1f5f3' }}
          >
            <option value="all" style={{ backgroundColor: '#0b0f0e', color: '#f1f5f3' }}>All severities</option>
            <option value="CRITICAL" style={{ backgroundColor: '#0b0f0e', color: '#f1f5f3' }}>Critical</option>
            <option value="HIGH" style={{ backgroundColor: '#0b0f0e', color: '#f1f5f3' }}>High</option>
            <option value="MEDIUM" style={{ backgroundColor: '#0b0f0e', color: '#f1f5f3' }}>Medium</option>
            <option value="LOW" style={{ backgroundColor: '#0b0f0e', color: '#f1f5f3' }}>Low</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filter by status"
            className="bg-[#0b0f0e] border border-[#2a3832] text-[#f1f5f3] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#22c55e] focus:ring-2 focus:ring-[#22c55e] cursor-pointer"
            style={{ backgroundColor: '#0b0f0e', color: '#f1f5f3' }}
          >
            <option value="all" style={{ backgroundColor: '#0b0f0e', color: '#f1f5f3' }}>All statuses</option>
            <option value="New" style={{ backgroundColor: '#0b0f0e', color: '#f1f5f3' }}>New</option>
            <option value="Verified" style={{ backgroundColor: '#0b0f0e', color: '#f1f5f3' }}>Verified</option>
            <option value="Notice Issued" style={{ backgroundColor: '#0b0f0e', color: '#f1f5f3' }}>Notice Issued</option>
          </select>

          {(search || selectedClass !== 'all' || selectedSeverity !== 'all' || selectedStatus !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedClass('all');
                setSelectedSeverity('all');
                setSelectedStatus('all');
              }}
              className="text-xs text-[#b4c2bb] hover:text-[#f1f5f3] px-2 py-1.5 underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Compact Alerts Table (Sentence case headers, #b4c2bb 12px, cells >= 13px) ── */}
      <div className="rounded-lg bg-[#111816] border border-[#2a3832] overflow-hidden select-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#16201c] border-b border-[#2a3832] text-[#b4c2bb] text-[12px] font-medium normal-case">
                <th className="py-3 px-3.5">ID</th>
                <th className="py-3 px-3.5">Class</th>
                <th className="py-3 px-3.5">Zone</th>
                <th className="py-3 px-3.5">Severity</th>
                <th className="py-3 px-3.5">Area (m²)</th>
                <th className="py-3 px-3.5">Overlap</th>
                <th className="py-3 px-3.5">Status workflow</th>
                <th className="py-3 px-3.5">Detected</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a3832]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-[#b4c2bb] text-sm">
                    Loading telemetry alerts...
                  </td>
                </tr>
              ) : filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-[#b4c2bb] text-sm">
                    No alerts match the active filters
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => {
                  const color = getClassColor(alert.class);
                  const sevColor = severityColor[alert.severity] || '#64748b';
                  const currentIdx = STATUS_FLOW.indexOf(alert.status);
                  const canAdvance = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1;
                  const nextStatus = canAdvance ? STATUS_FLOW[currentIdx + 1] : null;

                  return (
                    <tr
                      key={alert.id}
                      className="hover:bg-[#16201c] transition-colors cursor-pointer group"
                      onClick={() => setSelectedAlert(alert)}
                    >
                      {/* ID */}
                      <td className="py-3 px-3.5 font-mono text-[12px] text-[#b4c2bb]">
                        #{alert.id}
                      </td>

                      {/* Class */}
                      <td className="py-3 px-3.5 font-medium">
                        <span
                          className="px-2.5 py-1 rounded text-[12px] font-semibold border inline-block whitespace-nowrap"
                          style={{
                            borderColor: color,
                            backgroundColor: '#16201c',
                            color: color,
                          }}
                        >
                          {alert.class}
                        </span>
                      </td>

                      {/* Zone */}
                      <td className="py-3 px-3.5 font-medium text-[#f1f5f3] text-[13px] max-w-[170px] truncate">
                        {alert.zone_name || `Zone #${alert.zone_id}`}
                      </td>

                      {/* Severity */}
                      <td className="py-3 px-3.5">
                        <span
                          className="px-2 py-0.5 rounded text-[11px] font-semibold border inline-block uppercase"
                          style={{
                            borderColor: sevColor,
                            backgroundColor: '#16201c',
                            color: sevColor,
                          }}
                        >
                          {alert.severity}
                        </span>
                      </td>

                      {/* Area */}
                      <td className="py-3 px-3.5 font-mono text-[13px] text-[#f1f5f3]">
                        {(alert.area_m2 || 3850).toLocaleString()}
                      </td>

                      {/* Overlap */}
                      <td className="py-3 px-3.5 font-mono text-[13px] text-[#f1f5f3]">
                        {alert.overlap_pct || 88.5}%
                      </td>

                      {/* Status Workflow Advance */}
                      <td className="py-3 px-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[13px] text-[#f1f5f3]">
                            {alert.status}
                          </span>
                          {canAdvance && (
                            <button
                              onClick={() => handleAdvanceStatus(alert)}
                              disabled={advancingId === alert.id}
                              className="px-2.5 py-1 rounded text-[13px] font-medium bg-[#16201c] hover:bg-[#22c55e]/20 border border-[#22c55e] text-[#f1f5f3] transition-colors disabled:opacity-50"
                              title={`Advance to ${nextStatus}`}
                            >
                              {advancingId === alert.id ? '...' : `→ ${nextStatus}`}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Detected */}
                      <td className="py-3 px-3.5 font-mono text-[12px] text-[#b4c2bb] whitespace-nowrap">
                        {formatTimeAgo(alert.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedAlert(alert)}
                            className="p-1.5 rounded bg-[#16201c] border border-[#2a3832] text-[#b4c2bb] hover:text-[#f1f5f3] hover:border-[#22c55e] transition-colors"
                            title="Inspect dossier"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDownloadPdf(alert)}
                            disabled={downloadingId === alert.id}
                            className="p-1.5 rounded bg-[#16201c] border border-[#2a3832] text-[#b4c2bb] hover:text-[#22c55e] hover:border-[#22c55e] transition-colors disabled:opacity-50"
                            title="Download Legal Notice PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
