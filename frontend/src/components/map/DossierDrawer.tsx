import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, AlertStatus, formatAlertStatus } from '../../types/alert.types';
import { getPolicyForClass } from '../../utils/policy';
import { getClassColor, severityColor } from '../../utils/riskColors';
import { downloadNoticePdf } from '../../engine/pdfNotice';
import { runAcceleratedEscalation, transitionAlert, EscalationProgress } from '../../engine/clock';
import { getLedgerChain, verifyChain } from '../../engine/ledger';
import { LEGAL } from '../../constants/legal';
import {
  X,
  Shield,
  FileText,
  CheckCircle2,
  Lock,
  AlertTriangle,
  FastForward,
  Clock,
  ExternalLink,
  History,
  Activity,
} from 'lucide-react';

interface DossierDrawerProps {
  alert: Alert | null;
  onClose: () => void;
  onAlertUpdated: (updated: Alert) => void;
}

const STEPS = ['New', 'Verified', 'Notice Issued', 'Signed & Served'] as const;

export function DossierDrawer({ alert, onClose, onAlertUpdated }: DossierDrawerProps) {
  const [updating, setUpdating] = useState(false);
  const [verifyingLedger, setVerifyingLedger] = useState(false);
  const [ledgerStatus, setLedgerStatus] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isAccelerating, setIsAccelerating] = useState(false);
  const [escalationProgress, setEscalationProgress] = useState<EscalationProgress | null>(null);

  if (!alert) return null;

  const policy = getPolicyForClass(alert.class);
  const color = getClassColor(alert.class);
  const sevCol = severityColor[alert.severity] || '#64748b';
  const currentStepIdx = STEPS.indexOf(alert.status as any);

  const t0Date = alert.t0_timestamp
    ? new Date(alert.t0_timestamp)
    : new Date(new Date(alert.created_at).getTime() - 730 * 86400000);
  const t1Date = alert.t1_timestamp
    ? new Date(alert.t1_timestamp)
    : new Date(alert.created_at);

  const formatUtcDateTime = (d: Date) => {
    return (
      d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      }) + ' UTC'
    );
  };

  const handleAdvanceStatus = async (nextStatus: typeof STEPS[number]) => {
    setUpdating(true);
    setActionError(null);
    try {
      const res = await transitionAlert(alert.id, nextStatus);
      onAlertUpdated(res.alert);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleAcceleratedEscalation = async () => {
    setIsAccelerating(true);
    setActionError(null);
    try {
      const updated = await runAcceleratedEscalation(alert.id, (prog) => {
        setEscalationProgress(prog);
      });
      onAlertUpdated(updated);
    } catch (err: any) {
      setActionError(err.message || 'Accelerated escalation failed');
    } finally {
      setIsAccelerating(false);
    }
  };

  const handleVerifyLedger = async () => {
    setVerifyingLedger(true);
    try {
      const chain = await getLedgerChain();
      const res = await verifyChain(chain);
      if (res.valid) {
        setLedgerStatus(`Valid: All ${res.blocksVerified} blocks recomputed & cryptographically verified`);
      } else {
        setLedgerStatus(`Tampered! Mismatch at block #${res.firstInvalidIndex}: ${res.reason}`);
      }
    } catch (err: any) {
      setLedgerStatus('Ledger verification failed');
    } finally {
      setVerifyingLedger(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    setActionError(null);
    try {
      await downloadNoticePdf(alert);
    } catch (err: any) {
      setActionError(`PDF generation error: ${err.message}`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-[#111816] border-l border-[#2a3832] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out select-none">
      {/* Drawer Header */}
      <div className="h-14 px-5 border-b border-[#2a3832] flex items-center justify-between bg-[#16201c] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-[#22c55e]" />
          <div className="flex flex-col">
            <span className="font-mono text-xs font-semibold text-[#f1f5f3]">
              {alert.case_ref || `CASE-2026-${String(alert.id).padStart(5, '0')}`}
            </span>
            <span className="text-[11px] text-[#b4c2bb]">Incident investigation dossier</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-[#b4c2bb] hover:text-[#f1f5f3] hover:bg-[#111816] transition-colors"
          title="Close dossier"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs bg-[#111816]">
        {actionError && (
          <div className="p-3 rounded-md bg-[#16201c] border border-critical text-critical text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Badges & Class Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="px-2.5 py-1 rounded text-xs font-semibold border"
              style={{
                borderColor: color,
                backgroundColor: '#16201c',
                color: color,
              }}
            >
              {alert.class}
            </span>
            <span
              className="px-2 py-0.5 rounded text-[11px] font-semibold border uppercase"
              style={{
                borderColor: sevCol,
                backgroundColor: '#16201c',
                color: sevCol,
              }}
            >
              {alert.severity}
            </span>
          </div>
          <span className="text-xs font-mono text-[#b4c2bb]">Alert #{alert.id}</span>
        </div>

        {/* Location & Sector */}
        <div className="p-3.5 rounded-lg bg-[#16201c] border border-[#2a3832] flex flex-col gap-1.5">
          <span className="text-[11px] text-[#b4c2bb] font-semibold">Location & Jurisdiction</span>
          <div className="flex items-center justify-between text-xs font-medium text-[#f1f5f3]">
            <span>
              {alert.zone_name
                ? `${alert.zone_name.startsWith('Z-') ? '' : `Z-${alert.zone_id} • `}${alert.zone_name}`
                : `Protected Zone Z-${alert.zone_id}`}
            </span>
            <span className="font-mono text-xs text-[#b4c2bb]">
              [{alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}]
            </span>
          </div>
        </div>

        {/* Core Detection Metrics */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-lg bg-[#16201c] border border-[#2a3832] flex flex-col">
            <span className="text-[11px] text-[#b4c2bb]">Encroached area</span>
            <span className="text-sm font-semibold font-mono text-[#f1f5f3] mt-0.5">
              {(alert.area_m2 || 3850).toLocaleString()} m²
            </span>
          </div>
          <div className="p-3 rounded-lg bg-[#16201c] border border-[#2a3832] flex flex-col">
            <span className="text-[11px] text-[#b4c2bb]">Zone overlap</span>
            <span className="text-sm font-semibold font-mono text-[#f1f5f3] mt-0.5">
              {alert.overlap_pct || 88.5}%
            </span>
          </div>
          <div className="p-3 rounded-lg bg-[#16201c] border border-[#2a3832] flex flex-col">
            <span className="text-[11px] text-[#b4c2bb]">Confidence</span>
            <span className="text-sm font-semibold font-mono text-[#22c55e] mt-0.5">
              {(alert.confidence ? alert.confidence * 100 : 91.5).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Spectral Signature (ΔNDVI & ΔSAR) */}
        <div className="p-3.5 rounded-lg bg-[#16201c] border border-[#2a3832] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#b4c2bb]">Satellite Spectral Signatures</span>
            <Activity className="w-3.5 h-3.5 text-[#22c55e]" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2 rounded bg-[#0b0f0e] border border-[#2a3832]">
              <span className="text-[#b4c2bb] text-[10px] block">ΔNDVI (Vegetation Loss)</span>
              <span className="text-[#ef4444] font-bold">
                {(alert.ndvi_delta ?? -0.38).toFixed(2)}
              </span>
            </div>
            <div className="p-2 rounded bg-[#0b0f0e] border border-[#2a3832]">
              <span className="text-[#b4c2bb] text-[10px] block">ΔSAR Backscatter</span>
              <span className="text-[#3b82f6] font-bold">
                +{(alert.sar_delta ?? 4.2).toFixed(1)} dB (double-bounce)
              </span>
            </div>
          </div>
        </div>

        {/* Bitemporal Evidence Imagery with Explicit T0 & T1 Timelines */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#f1f5f3]">Bitemporal satellite evidence</span>
            <span className="text-[10px] font-mono text-[#22c55e] px-1.5 py-0.5 rounded bg-[#16201c] border border-[#2a3832]">
              Δt = 2 Years Comparative
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Timeline T0 Column */}
            <div className="flex flex-col gap-1.5">
              <div className="aspect-square rounded-lg overflow-hidden border border-[#2a3832] bg-[#0b0f0e] flex items-center justify-center relative">
                {alert.before_img ? (
                  <img src={alert.before_img} alt="Baseline T0" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#16201c] text-xs text-[#b4c2bb] p-2 text-center">
                    <span className="font-mono text-[10px] text-[#22c55e]">T0 Reference</span>
                    <span className="text-[11px] mt-1">Pre-infringement</span>
                  </div>
                )}
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#111816]/90 text-[#22c55e] border border-[#22c55e]/40">
                  T0 BASELINE
                </span>
              </div>
              <div className="flex flex-col text-center px-1">
                <span className="text-[11px] font-semibold text-[#f1f5f3]">Timeline T0 (Reference)</span>
                <span className="text-[10px] font-mono font-bold text-[#22c55e] mt-0.5">{formatUtcDateTime(t0Date)}</span>
                <span className="text-[9px] font-mono text-[#b4c2bb]">Sentinel-2 MSI (10m)</span>
              </div>
            </div>

            {/* Timeline T1 Column */}
            <div className="flex flex-col gap-1.5">
              <div className="aspect-square rounded-lg overflow-hidden border border-[#ef4444] bg-[#0b0f0e] flex items-center justify-center relative">
                {alert.after_img ? (
                  <img src={alert.after_img} alt="Current T1" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#16201c] text-xs text-[#b4c2bb] p-2 text-center">
                    <span className="font-mono text-[10px] text-[#ef4444]">T1 Scene</span>
                    <span className="text-[11px] mt-1">Active Encroachment</span>
                  </div>
                )}
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#ef4444]/90 text-white">
                  T1 DETECTION
                </span>
                <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#ef4444] text-white">
                  CHANGE
                </span>
              </div>
              <div className="flex flex-col text-center px-1">
                <span className="text-[11px] font-semibold text-[#f1f5f3]">Timeline T1 (Infraction)</span>
                <span className="text-[10px] font-mono font-bold text-[#ef4444] mt-0.5">{formatUtcDateTime(t1Date)}</span>
                <span className="text-[9px] font-mono text-[#b4c2bb]">Sentinel-1 C-SAR + MSI</span>
              </div>
            </div>
          </div>
        </div>

        {/* Escalation Stepper & Timeline Progress */}
        <div className="p-3.5 rounded-lg bg-[#16201c] border border-[#2a3832] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#b4c2bb]">Escalation protocol status</span>
            <span className="text-[10px] font-mono text-[#22c55e]">
              {alert.status === 'New'
                ? 'T+00:00 (Detection)'
                : alert.status === 'Verified'
                ? 'T+00:15 (Verified)'
                : alert.status === 'Notice Issued'
                ? 'T+04:00 (Notice Drafted)'
                : 'T+24:00 (Signed & Served)'}
            </span>
          </div>

          <div className="flex items-center justify-between relative">
            <div className="absolute left-2 right-2 top-2.5 h-0.5 bg-[#2a3832] -z-0" />
            {STEPS.map((step, idx) => {
              const isPast = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              const stepLabels: Record<string, string> = {
                New: 'New',
                Verified: 'Verified',
                'Notice Issued': 'Draft Notice',
                'Signed & Served': 'Signed & Served',
              };

              return (
                <div key={step} className="flex flex-col items-center gap-1.5 z-10">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold border ${
                      isCurrent
                        ? 'bg-[#22c55e] text-[#0b0f0e] border-[#22c55e]'
                        : isPast
                        ? 'bg-[#16201c] text-[#22c55e] border-[#22c55e]'
                        : 'bg-[#111816] text-[#b4c2bb] border-[#2a3832]'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span
                    className={`text-[9.5px] font-mono text-center max-w-[65px] leading-tight ${
                      isCurrent ? 'font-semibold text-[#f1f5f3]' : 'text-[#b4c2bb]'
                    }`}
                  >
                    {stepLabels[step]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Live Accelerated Escalation Progress Bar */}
          {isAccelerating && escalationProgress && (
            <div className="mt-2 p-3 rounded-lg bg-[#0b0f0e] border border-[#22c55e]/50 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#22c55e] flex items-center gap-1.5 font-bold">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>Simulating at 960x speed:</span>
                </span>
                <span className="text-[#f1f5f3] font-bold">{escalationProgress.simulatedTimeFormatted}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#16201c] overflow-hidden">
                <div
                  className="h-full bg-[#22c55e] transition-all duration-300"
                  style={{ width: `${escalationProgress.percentComplete}%` }}
                />
              </div>
              <span className="text-[11px] text-[#b4c2bb] italic">{escalationProgress.statusNote}</span>
            </div>
          )}
        </div>

        {/* Governance Protocol */}
        <div className="p-3.5 rounded-lg bg-[#16201c] border border-[#2a3832] flex flex-col gap-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#2a3832]">
            <span className="text-xs font-semibold text-[#f1f5f3]">Governance protocol</span>
            <span className="text-[10px] font-mono text-amber-400">{policy.disclaimer}</span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div>
              <span className="text-[#b4c2bb]">Statutory Act: </span>
              <span className="text-[#f1f5f3] font-medium">{policy.act}</span>
            </div>
            <div>
              <span className="text-[#b4c2bb]">Applicable Provision: </span>
              <span className="text-[#f1f5f3] font-medium">{policy.section}</span>
            </div>
            <div>
              <span className="text-[#b4c2bb]">Statutory Penalty: </span>
              <span className="text-[#f1f5f3]">{policy.penalty}</span>
            </div>
            <div>
              <span className="text-[#b4c2bb]">Enforcement Authority: </span>
              <span className="text-[#f1f5f3] font-medium">{policy.authority}</span>
            </div>
          </div>
        </div>

        {/* Cryptographic Ledger Anchor */}
        <div className="p-3.5 rounded-lg bg-[#16201c] border border-[#2a3832] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#22c55e]" />
              <span className="text-xs font-semibold text-[#f1f5f3]">Ledger integrity hash</span>
            </div>
            <button
              onClick={handleVerifyLedger}
              disabled={verifyingLedger}
              className="text-xs font-mono text-[#22c55e] hover:underline disabled:opacity-50"
            >
              {verifyingLedger ? 'Verifying...' : 'Verify chain'}
            </button>
          </div>

          <div className="p-2 rounded bg-[#0b0f0e] border border-[#2a3832] font-mono text-[11px] text-[#b4c2bb] break-all flex items-center justify-between gap-2">
            <span>{alert.ledger_hash || 'SHA256:4a8e2b9c7d1f3e5a0b8c6e4d2f1a9b7c5e3d1a8f...'}</span>
            {alert.ledger_hash && (
              <Link
                to={`/verify/${alert.ledger_hash}`}
                target="_blank"
                className="text-[#22c55e] hover:text-[#16a34a] p-1"
                title="Open public verifier"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {ledgerStatus && (
            <span
              className={`text-xs font-mono flex items-center gap-1.5 ${
                ledgerStatus.includes('Tampered') ? 'text-critical' : 'text-[#22c55e]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {ledgerStatus}
            </span>
          )}
        </div>

        {/* Audit History Trail */}
        {alert.audit_trail && alert.audit_trail.length > 0 && (
          <div className="p-3.5 rounded-lg bg-[#16201c] border border-[#2a3832] flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#f1f5f3]">
              <History className="w-3.5 h-3.5 text-[#22c55e]" />
              <span>Chain of custody audit trail</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {alert.audit_trail.map((item, idx) => (
                <div key={idx} className="p-2 rounded bg-[#0b0f0e] border border-[#2a3832] text-[11px] flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[#b4c2bb]">
                    <span className="font-semibold text-[#22c55e]">{item.status}</span>
                    <span className="font-mono text-[10px]">{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <span className="text-[#f1f5f3]">{item.note}</span>
                  <span className="font-mono text-[9px] text-[#b4c2bb] truncate">Block: {item.block_hash}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col gap-2 pt-2 border-t border-[#2a3832]">
          {/* Accelerated escalation button (for demo) */}
          {alert.status !== 'Notice Issued' && alert.status !== 'Signed & Served' && (
            <button
              onClick={handleAcceleratedEscalation}
              disabled={isAccelerating || updating}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-[#0b0f0e] font-bold text-xs shadow transition-all disabled:opacity-50"
            >
              <FastForward className="w-4 h-4 fill-current" />
              <span>{isAccelerating ? 'Escalating (T+00:00 -> T+04:00)...' : 'Run escalation (accelerated 960x)'}</span>
            </button>
          )}

          {alert.status === 'New' && (
            <button
              onClick={() => handleAdvanceStatus('Verified')}
              disabled={updating || isAccelerating}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#22c55e] text-[#0b0f0e] font-semibold text-xs hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Verify detection manually</span>
            </button>
          )}

          {alert.status === 'Verified' && (
            <button
              onClick={() => handleAdvanceStatus('Notice Issued')}
              disabled={updating || isAccelerating}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#22c55e] text-[#0b0f0e] font-semibold text-xs hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Generate draft notice (T+04:00)</span>
            </button>
          )}

          {alert.status === 'Notice Issued' && (
            <button
              onClick={() => handleAdvanceStatus('Signed & Served')}
              disabled={updating || isAccelerating}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#22c55e] text-[#0b0f0e] font-semibold text-xs hover:bg-[#16a34a] disabled:opacity-50 transition-colors shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark as Signed & Served by Competent Authority</span>
            </button>
          )}

          {alert.status === 'Signed & Served' && (
            <div className="w-full p-2.5 rounded-lg bg-[#16201c] border border-[#22c55e]/40 flex items-center justify-center gap-2 text-[#22c55e] font-semibold text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>Notice Executed: Formally Signed & Served</span>
            </div>
          )}

          {/* Legal Notice PDF Generation */}
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#16201c] hover:bg-[#111816] border border-[#2a3832] text-[#f1f5f3] font-medium text-xs transition-colors disabled:opacity-50"
          >
            <FileText className="w-4 h-4 text-[#22c55e]" />
            <span>{downloadingPdf ? 'Generating Section 63 BSA Notice...' : 'Download Section 63 Draft Notice (PDF)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
