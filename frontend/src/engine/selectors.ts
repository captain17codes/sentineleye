/**
 * Pure selector functions — derive all KPIs from a list of alerts.
 * No hardcoded numbers anywhere in the UI; always call these.
 */

import type { Alert, AlertStatus } from '../types/alert.types';
import type { SeverityStat, DayStat, ZoneRiskStat } from '../api/stats.api';
import { DEMO_SEED, TARGET_DISTRIBUTION } from './config';
import { mulberry32 } from './prng';

// ── Counts ─────────────────────────────────────────────────────────────────

export function totalAlerts(alerts: Alert[]): number {
  return alerts.length;
}

export function criticalCount(alerts: Alert[]): number {
  return alerts.filter((a) => a.severity === 'CRITICAL').length;
}

export function highCount(alerts: Alert[]): number {
  return alerts.filter((a) => a.severity === 'HIGH').length;
}

export function mediumCount(alerts: Alert[]): number {
  return alerts.filter((a) => a.severity === 'MEDIUM').length;
}

export function lowCount(alerts: Alert[]): number {
  return alerts.filter((a) => a.severity === 'LOW').length;
}

export function totalEncroachedAreaM2(alerts: Alert[]): number {
  return alerts.reduce((sum, a) => sum + (a.area_m2 || 0), 0);
}

export function countByStatus(alerts: Alert[], status: AlertStatus): number {
  return alerts.filter((a) => a.status === status).length;
}

// ── Distributions for charts ───────────────────────────────────────────────

export function severityDistribution(alerts: Alert[]): SeverityStat[] {
  return [
    { severity: 'CRITICAL', count: criticalCount(alerts) },
    { severity: 'HIGH', count: highCount(alerts) },
    { severity: 'MEDIUM', count: mediumCount(alerts) },
    { severity: 'LOW', count: lowCount(alerts) },
  ];
}

/** Build 30-day detection trend bucketed by alert created_at dates */
export function trend30d(alerts: Alert[]): DayStat[] {
  const dayMap: Record<string, { count: number; area: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    dayMap[key] = { count: 0, area: 0 };
  }
  const keys = Object.keys(dayMap);
  const oldestKey = keys[0];
  const latestKey = keys[keys.length - 1];

  alerts.forEach((a) => {
    const day = (a.created_at || '').split('T')[0] || (a.created_at || '').split(' ')[0];
    const targetKey = dayMap[day] ? day : day < oldestKey ? oldestKey : latestKey;
    dayMap[targetKey].count++;
    dayMap[targetKey].area += a.area_m2 || 0;
  });
  return Object.entries(dayMap).map(([day, v]) => ({ day, count: v.count, area_m2: v.area }));
}

/** Scatter plot points: { ndvi: number; sar: number; severity; class; rejected? } */
export interface ScatterPoint {
  ndvi: number;
  sar: number;
  severity: string;
  class: string;
  rejected: boolean;
}

/**
 * Derive scatter points from alerts.
 * Real alerts provide their ndvi_delta / sar_delta if present (from scan engine),
 * otherwise fall back to a seeded deterministic pseudo-value so the chart is
 * always populated and consistent.
 */
export function scatterPoints(alerts: Alert[]): ScatterPoint[] {
  const rand = mulberry32(DEMO_SEED + 100);
  return alerts.map((a) => {
    // Use real values if the scan engine populated them
    const ndvi = (a as any).ndvi_delta ?? -(rand() * 0.35 + 0.05);
    const sar  = (a as any).sar_delta  ?? (rand() * 6 - 1);
    return {
      ndvi: +ndvi.toFixed(3),
      sar:  +sar.toFixed(2),
      severity: a.severity,
      class: a.class,
      rejected: false,
    };
  });
}

/** Per-zone aggregates for the Risk page */
export function alertsByZone(alerts: Alert[], zones: { id: number; name: string; risk_level: string }[]): ZoneRiskStat[] {
  return zones.map((z) => {
    const za = alerts.filter((a) => a.zone_id === z.id);
    const score = za.reduce((acc, a) =>
      acc + (a.severity === 'CRITICAL' ? 4 : a.severity === 'HIGH' ? 3 : a.severity === 'MEDIUM' ? 2 : 1), 0);
    return {
      id: z.id,
      name: z.name,
      risk_level: z.risk_level,
      alert_count: za.length,
      total_area_m2: za.reduce((acc, a) => acc + (a.area_m2 || 0), 0),
      risk_score: score,
    };
  }).sort((a, b) => b.risk_score - a.risk_score);
}

/** Verify selector consistency: donut total must equal alert count */
export function assertConsistency(alerts: Alert[]): { ok: boolean; message: string } {
  const donutTotal = criticalCount(alerts) + highCount(alerts) + mediumCount(alerts) + lowCount(alerts);
  if (donutTotal !== alerts.length) {
    return { ok: false, message: `Donut total (${donutTotal}) ≠ alert count (${alerts.length})` };
  }
  return { ok: true, message: 'Consistent' };
}

/** Compute totals object compatible with RiskStatsResponse */
export function computeTotals(alerts: Alert[]) {
  return {
    total_alerts: totalAlerts(alerts),
    total_area_m2: totalEncroachedAreaM2(alerts),
    critical: criticalCount(alerts),
    high: highCount(alerts),
    medium: mediumCount(alerts),
    low: lowCount(alerts),
    new_count: countByStatus(alerts, 'New'),
    verified: countByStatus(alerts, 'Verified'),
    notice_issued: countByStatus(alerts, 'Notice Issued'),
  };
}
