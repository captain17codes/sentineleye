import { describe, it, expect, beforeEach } from 'vitest';
import { getStore, resetDemo } from '../store/alertStore';
import { criticalCount, highCount, mediumCount, lowCount, totalAlerts, totalEncroachedAreaM2 } from '../selectors';

describe('Real Scan Pipeline Seed Alert Verification', () => {
  beforeEach(() => {
    resetDemo();
  });

  it('generates exactly 38 alerts with real pipeline outputs matching target distribution 6/14/11/7', () => {
    const store = getStore();
    const alerts = store.alerts;

    expect(totalAlerts(alerts)).toBe(38);
    expect(criticalCount(alerts)).toBe(6);
    expect(highCount(alerts)).toBe(14);
    expect(mediumCount(alerts)).toBe(11);
    expect(lowCount(alerts)).toBe(7);

    // Sum of donut must equal total alerts
    expect(criticalCount(alerts) + highCount(alerts) + mediumCount(alerts) + lowCount(alerts)).toBe(38);

    // Verify computed area
    const totalArea = totalEncroachedAreaM2(alerts);
    expect(totalArea).toBe(233600);

    // Verify every alert has real spectral values
    alerts.forEach((alert) => {
      expect(alert.ndvi_delta).toBeLessThan(0);
      expect(alert.sar_delta).toBeGreaterThan(1.5);
      expect(alert.area_m2).toBeGreaterThan(0);
      expect(alert.overlap_pct).toBeGreaterThanOrEqual(35);
      expect(alert.lat).toBeGreaterThan(25.0);
      expect(alert.lng).toBeGreaterThan(75.0);
      expect(alert.zone_id).toBeGreaterThanOrEqual(101);
      expect(alert.zone_id).toBeLessThanOrEqual(108);
    });
  });
});
