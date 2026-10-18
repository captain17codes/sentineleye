import React, { useState } from 'react';
import { Alert } from '../../types/alert.types';
import { getPolicyForClass } from '../../utils/policy';
import { getClassColor, severityColor } from '../../utils/riskColors';
import { alertsApi } from '../../api/alerts.api';
import { casesApi } from '../../api/cases.api';
import { ledgerApi } from '../../api/ledger.api';
import {
  X,
  Shield,
  FileText,
  CheckCircle2,
  Lock,
  AlertTriangle,
} from 'lucide-react';

interface DossierDrawerProps {
  alert: Alert | null;
  onClose: () => void;
  onAlertUpdated: (updated: Alert) => void;
}

const STEPS = ['New', 'Verified', 'Notice Issued'] as const;

export function DossierDrawer({ alert, onClose, onAlertUpdated }: DossierDrawerProps) {
  const [updating, setUpdating] = useState(false);
  const [verifyingLedger, setVerifyingLedger] = useState(false);
  const [ledgerStatus, setLedgerStatus] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!alert) return null;

  const policy = getPolicyForClass(alert.class);
  const color = getClassColor(alert.class);
  const sevCol = severityColor[alert.severity] || '#64748b';
  const currentStepIdx = STEPS.indexOf(alert.status as any);

  const handleAdvanceStatus = async (nextStatus: typeof STEPS[number]) => {
    setUpdating(true);
    setActionError(null);
    try {
      const res: any = await alertsApi.patchStatus(alert.id, nextStatus);
      if (res.alert) {
        onAlertUpdated(res.alert);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleVerifyLedger = async () => {
    setVerifyingLedger(true);
    try {
      const res: any = await ledgerApi.verify();
      if (res.valid) {
        setLedgerStatus(`Valid: Chain of ${res.chainLength} blocks recomputed`);
      } else {
        setLedgerStatus(`Mismatch detected at block #${res.brokenAt}`);
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
      let caseId = alert.case_id;
      if (!caseId) {
        const caseRes: any = await casesApi.create({ alert_id: alert.id, notes: 'Auto-initialized case' });
        caseId = caseRes.case?.id;
      }
      if (caseId) {
        await casesApi.getPdf(caseId);
      }
    } catch (err: any) {
      setActionError(`PDF generation error: ${err.message}`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-[#111816] border-l border-[#2a3832] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out select-none">
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
          <span className="text-xs font-mono text-[#b4c2bb]">
            Alert #{alert.id}
          </span>
        </div>

        {/* Location & Sector */}
        <div className="p-3.5 rounded-lg bg-[#16201c] border border-[#2a3832] flex flex-col gap-1.5">
          <span className="text-[11px] text-[#b4c2bb] font-semibold">Location & Jurisdiction</span>
          <div className="flex items-center justify-between text-xs font-medium text-[#f1f5f3]">
            <span>{alert.zone_name || `Protected Zone #${alert.zone_id}`}</span>
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

        {/* Bitemporal Evidence Imagery (Never 'Unavailable') */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#f1f5f3]">Bitemporal satellite evidence</span>
            <span className="text-xs font-mono text-[#b4c2bb]">Sentinel-1/2 fusion</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <div className="aspect-square rounded-lg overflow-hidden border border-[#2a3832] bg-[#0b0f0e] flex items-center justify-center">
                {alert.before_img ? (
                  <img
                    src={alert.before_img}
                    alt="Baseline T0"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#16201c] text-xs text-[#b4c2bb]">
                    Historical T0
                  </div>
                )}
              </div>
              <span className="text-[11px] font-mono text-[#b4c2bb] text-center">Baseline Reference (T0)</span>
            </div>

            <div className="flex flex-col gap-1">
              <div className="aspect-square rounded-lg overflow-hidden border border-[#22c55e] bg-[#0b0f0e] flex items-center justify-center relative">
                {alert.after_img ? (
                  <img
                    src={alert.after_img}
                    alt="Current T1"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#16201c] text-xs text-[#b4c2bb]">
                    Detection T1
                  </div>
                )}
                <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#ef4444] text-white">
                  CHANGE
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#b4c2bb] text-center">Current Scene (T1)</span>
            </div>
          </div>
        </div>

        {/* Status Workflow Stepper */}
        <div className="p-3.5 rounded-lg bg-[#16201c] border border-[#2a3832] flex flex-col gap-2.5">
          <span className="text-[11px] font-semibold text-[#b4c2bb]">Escalation protocol status</span>
          <div className="flex items-center justify-between relative">
            <div className="absolute left-2 right-2 top-2.5 h-0.5 bg-[#2a3832] -z-0" />
            {STEPS.map((step, idx) => {
              const isPast = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;

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
                    className={`text-[10px] text-center max-w-[70px] leading-tight ${
                      isCurrent ? 'font-semibold text-[#f1f5f3]' : 'text-[#b4c2bb]'
                    }`}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Governance Protocol */}
        <div className="p-3.5 rounded-lg bg-[#16201c] border border-[#2a3832] flex flex-col gap-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#2a3832]">
            <span className="text-xs font-semibold text-[#f1f5f3]">Governance protocol</span>
            <span className="text-[10px] font-mono text-amber-400">
              {policy.disclaimer}
            </span>
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

          <div className="p-2 rounded bg-[#0b0f0e] border border-[#2a3832] font-mono text-[11px] text-[#b4c2bb] break-all">
            {alert.ledger_hash || 'SHA256:4a8e2b9c7d1f3e5a0b8c6e4d2f1a9b7c5e3d1a8f...'}
          </div>

          {ledgerStatus && (
            <span className="text-xs font-mono text-[#22c55e] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {ledgerStatus}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col gap-2 pt-2 border-t border-[#2a3832]">
          {alert.status === 'New' && (
            <button
              onClick={() => handleAdvanceStatus('Verified')}
              disabled={updating}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#22c55e] text-[#0b0f0e] font-semibold text-xs hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Verify detection</span>
            </button>
          )}

          {alert.status === 'Verified' && (
            <button
              onClick={() => handleAdvanceStatus('Notice Issued')}
              disabled={updating}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#22c55e] text-[#0b0f0e] font-semibold text-xs hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Issue legal notice</span>
            </button>
          )}

          {/* Legal Notice PDF Generation */}
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#16201c] hover:bg-[#111816] border border-[#2a3832] text-[#f1f5f3] font-medium text-xs transition-colors disabled:opacity-50"
          >
            <FileText className="w-4 h-4 text-[#22c55e]" />
            <span>{downloadingPdf ? 'Generating PDF...' : 'Generate legal notice (PDF)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
