/**
 * clock.ts — Simulated operational clock and automated escalation orchestrator.
 * Supports speed multipliers (1x, 60x, 960x).
 * At 960x, 4 statutory hours pass in 15 real seconds.
 */

import { Alert, AlertStatus, AuditEntry } from '../types/alert.types';
import { getAlerts, updateAlert } from './store/alertStore';
import { addLedgerRecord, LedgerBlock, BlockType } from './ledger';
import { LEGAL } from '../constants/legal';

export type ClockSpeed = 1 | 60 | 960;

export interface EscalationProgress {
  stage: 'IDLE' | 'VERIFYING' | 'VERIFIED' | 'PREPARING_NOTICE' | 'NOTICE_ISSUED' | 'COMPLETE';
  simulatedElapsedMinutes: number;
  simulatedTimeFormatted: string; // e.g. "T+00:15" or "T+04:00"
  percentComplete: number; // 0 to 100
  currentStatus: AlertStatus;
  statusNote: string;
}

export interface TransitionResult {
  alert: Alert;
  block: LedgerBlock;
  previousStatus: AlertStatus;
  newStatus: AlertStatus;
}

// ── Clock State ────────────────────────────────────────────────────────────

let _clockSpeed: ClockSpeed = 960;
let _baseSimulatedTime = Date.now();
const listeners = new Set<(speed: ClockSpeed) => void>();

export function getClockSpeed(): ClockSpeed {
  return _clockSpeed;
}

export function setClockSpeed(speed: ClockSpeed): void {
  _clockSpeed = speed;
  listeners.forEach((fn) => fn(_clockSpeed));
}

export function subscribeClockSpeed(fn: (speed: ClockSpeed) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function formatSimulatedOffset(elapsedMinutes: number): string {
  const hours = Math.floor(elapsedMinutes / 60);
  const mins = Math.floor(elapsedMinutes % 60);
  const secs = Math.floor((elapsedMinutes * 60) % 60);
  return `T+${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}${secs > 0 ? `:${String(secs).padStart(2, '0')}` : ''}`;
}

// ── Statutory Escalation State Transitions ─────────────────────────────────

const LEGAL_TRANSITIONS: Record<AlertStatus, AlertStatus[]> = {
  New: ['Verified'],
  Verified: ['Notice Issued'],
  'Notice Issued': ['Signed & Served'],
  'Signed & Served': [],
};

/**
 * Validate and execute a statutory state transition for an alert.
 * Appends a block to the cryptographic ledger and writes an immutable audit record.
 */
export async function transitionAlert(
  alertId: number,
  targetStatus: AlertStatus,
  operator = 'operator@sentineleye.com',
  note?: string,
  simulatedOffsetMinutes?: number
): Promise<TransitionResult> {
  const alert = getAlerts().find((a) => a.id === alertId);
  if (!alert) {
    throw new Error(`Alert #${alertId} not found in store.`);
  }

  const allowed = LEGAL_TRANSITIONS[alert.status];
  if (!allowed.includes(targetStatus)) {
    throw new Error(
      `Illegal transition from '${alert.status}' to '${targetStatus}'. Allowed: ${allowed.join(', ') || 'none'}`
    );
  }

  // Calculate timestamp
  const alertBaseTime = new Date(alert.created_at).getTime();
  const offsetMs =
    simulatedOffsetMinutes !== undefined
      ? simulatedOffsetMinutes * 60 * 1000
      : targetStatus === 'Verified'
      ? 15 * 60 * 1000 // T+15m
      : targetStatus === 'Notice Issued'
      ? 240 * 60 * 1000 // T+4h
      : 1440 * 60 * 1000; // T+24h (Signed & Served)
  const transitionTime = new Date(alertBaseTime + offsetMs).toISOString();

  let blockType: BlockType = 'VERIFIED';
  let statutoryPhase = 'T+00:15';
  let defaultNote = 'Multi-spectral satellite verification completed. Cadastral infringement confirmed.';

  if (targetStatus === 'Notice Issued') {
    blockType = 'NOTICE_ISSUED';
    statutoryPhase = 'T+04:00';
    defaultNote = `Draft statutory notice under ${LEGAL.EVIDENCE_ACT_CITATION} generated and registered on tamper-evident ledger for Competent Authority signature.`;
  } else if (targetStatus === 'Signed & Served') {
    blockType = 'SIGNED_AND_SERVED';
    statutoryPhase = 'T+24:00';
    defaultNote = 'Statutory notice formally signed by Competent Authority and served upon encroacher. Chain of custody finalized.';
  }

  const auditNote = note || defaultNote;

  // 1. Commit to cryptographic ledger
  const block = await addLedgerRecord(
    blockType,
    {
      alertId: alert.id,
      zoneId: alert.zone_id,
      zoneName: alert.zone_name,
      previousStatus: alert.status,
      newStatus: targetStatus,
      statutoryPhase,
      coordinates: [alert.lng, alert.lat],
      cadastralOverlapPct: alert.overlap_pct,
      areaM2: alert.area_m2,
      note: auditNote,
    },
    operator
  );

  // 2. Build audit trail entry
  const auditEntry: AuditEntry = {
    timestamp: transitionTime,
    status: targetStatus,
    operator,
    note: auditNote,
    block_hash: block.hash,
    block_index: block.index,
  };

  const updatedAuditTrail = [...(alert.audit_trail || []), auditEntry];

  // 3. Update alert in reactive store
  const updatedAlert = updateAlert(alert.id, {
    status: targetStatus,
    ledger_hash: block.hash,
    audit_trail: updatedAuditTrail,
  });

  if (!updatedAlert) {
    throw new Error(`Failed to update Alert #${alertId} in store.`);
  }

  return {
    alert: updatedAlert,
    block,
    previousStatus: alert.status,
    newStatus: targetStatus,
  };
}

// ── Accelerated Escalation Runner ──────────────────────────────────────────

/**
 * Runs an accelerated statutory escalation simulation.
 * At 960x speed, 4 hours elapse in 15 seconds.
 * Fires progress callbacks for UI bars and counters.
 */
export async function runAcceleratedEscalation(
  alertId: number,
  onProgress?: (progress: EscalationProgress) => void,
  abortSignal?: AbortSignal
): Promise<Alert> {
  let alert = getAlerts().find((a) => a.id === alertId);
  if (!alert) throw new Error(`Alert #${alertId} not found.`);

  if (alert.status === 'Notice Issued') {
    // Already fully escalated
    if (onProgress) {
      onProgress({
        stage: 'COMPLETE',
        simulatedElapsedMinutes: 240,
        simulatedTimeFormatted: 'T+04:00',
        percentComplete: 100,
        currentStatus: 'Notice Issued',
        statusNote: 'Statutory draft notice already prepared and anchored to blockchain ledger.',
      });
    }
    return alert;
  }

  const speed = _clockSpeed; // 960x: 1 sec real = 16 simulated minutes. Total 240m = 15.0s

  const sleep = (ms: number) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      if (abortSignal) {
        abortSignal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(new Error('Escalation aborted'));
          },
          { once: true }
        );
      }
    });

  // Stage 1: If currently 'New', transition to 'Verified' at T+00:15
  if (alert.status === 'New') {
    // Stage 1 duration: 15 sim minutes = 15 * 60 / speed seconds real. At 960x = 0.9375s
    const realMsStage1 = Math.max(800, (15 * 60 * 1000) / speed);
    const steps1 = 10;
    const interval1 = realMsStage1 / steps1;

    for (let i = 1; i <= steps1; i++) {
      await sleep(interval1);
      const elapsedMins = (15 * i) / steps1;
      const pct = Math.round((elapsedMins / 240) * 100);
      onProgress?.({
        stage: 'VERIFYING',
        simulatedElapsedMinutes: elapsedMins,
        simulatedTimeFormatted: formatSimulatedOffset(elapsedMins),
        percentComplete: pct,
        currentStatus: 'New',
        statusNote: 'Cross-verifying Sentinel-1 SAR & Sentinel-2 optical bitemporal bands...',
      });
    }

    const res = await transitionAlert(alertId, 'Verified', 'operator@sentineleye.com', undefined, 15);
    alert = res.alert;

    onProgress?.({
      stage: 'VERIFIED',
      simulatedElapsedMinutes: 15,
      simulatedTimeFormatted: 'T+00:15',
      percentComplete: 6,
      currentStatus: 'Verified',
      statusNote: `Verified by satellite pipeline. Committed block #${res.block.index} (${res.block.hash.slice(0, 10)}...)`,
    });

    await sleep(400);
  }

  // Stage 2: From 'Verified' (T+00:15) to 'Notice Issued' (T+04:00 = 240 mins)
  if (alert.status === 'Verified') {
    // Remaining sim minutes: 240 - 15 = 225. At 960x = 14.06s real.
    const realMsStage2 = Math.max(3000, (225 * 60 * 1000) / speed);
    const steps2 = 30;
    const interval2 = realMsStage2 / steps2;

    for (let i = 1; i <= steps2; i++) {
      await sleep(interval2);
      const elapsedMins = 15 + (225 * i) / steps2;
      const pct = Math.round((elapsedMins / 240) * 100);
      onProgress?.({
        stage: 'PREPARING_NOTICE',
        simulatedElapsedMinutes: elapsedMins,
        simulatedTimeFormatted: formatSimulatedOffset(elapsedMins),
        percentComplete: pct,
        currentStatus: 'Verified',
        statusNote: `Drafting Section 63 BSA statutory notice (${elapsedMins.toFixed(0)}m elapsed)...`,
      });
    }

    const res = await transitionAlert(alertId, 'Notice Issued', 'operator@sentineleye.com', undefined, 240);
    alert = res.alert;

    onProgress?.({
      stage: 'COMPLETE',
      simulatedElapsedMinutes: 240,
      simulatedTimeFormatted: 'T+04:00',
      percentComplete: 100,
      currentStatus: 'Notice Issued',
      statusNote: `Notice Drafted! Registered block #${res.block.index} (${res.block.hash.slice(0, 10)}...) — Pending Officer Signature`,
    });
  }

  return alert;
}
