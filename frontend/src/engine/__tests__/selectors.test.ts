import { describe, it, expect } from 'vitest';
import { getStore, getAlerts } from '../store/alertStore';
import {
  totalAlerts,
  criticalCount,
  highCount,
  mediumCount,
  lowCount,
  totalEncroachedAreaM2,
  severityDistribution,
  trend30d,
  computeTotals,
} from '../selectors';
import { TARGET_DISTRIBUTION } from '../config';

describe('Selectors & Data Consistency', () => {
  const store = getStore();
  const alerts = getAlerts();

  it('guarantees exactly 38 alerts from the deterministic seed', () => {
    expect(alerts.length).toBe(38);
    expect(totalAlerts(alerts)).toBe(38);
  });

  it('matches target severity distribution: 6 Critical, 14 High, 11 Medium, 7 Low', () => {
    expect(criticalCount(alerts)).toBe(TARGET_DISTRIBUTION.CRITICAL);
    expect(highCount(alerts)).toBe(TARGET_DISTRIBUTION.HIGH);
    expect(mediumCount(alerts)).toBe(TARGET_DISTRIBUTION.MEDIUM);
    expect(lowCount(alerts)).toBe(TARGET_DISTRIBUTION.LOW);

    const dist = severityDistribution(alerts);
    const sumFromDist = dist.reduce((acc, curr) => acc + curr.count, 0);
    expect(sumFromDist).toBe(38);
  });

  it('donut total matches KPI validated alerts count identically', () => {
    const kpiCount = totalAlerts(alerts);
    const dist = severityDistribution(alerts);
    const donutCount = dist.reduce((sum, item) => sum + item.count, 0);
    expect(donutCount).toBe(kpiCount);
  });

  it('total area in selectors matches the mathematical sum of all alert areas', () => {
    const computedSum = alerts.reduce((acc, curr) => acc + (curr.area_m2 || 0), 0);
    expect(totalEncroachedAreaM2(alerts)).toBe(computedSum);
  });

  it('30-day trend series sum equals the total alert count', () => {
    const trend = trend30d(alerts);
    const trendTotal = trend.reduce((sum, day) => sum + day.count, 0);
    expect(trendTotal).toBe(38);
  });

  it('computeTotals matches individual selector calculations', () => {
    const totals = computeTotals(alerts);
    expect(totals.total_alerts).toBe(38);
    expect(totals.critical).toBe(6);
    expect(totals.high).toBe(14);
    expect(totals.medium).toBe(11);
    expect(totals.low).toBe(7);
  });
});
