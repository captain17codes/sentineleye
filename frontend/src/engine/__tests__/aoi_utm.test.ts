import { describe, it, expect } from 'vitest';
import { __test, areaSizeM } from '../aoi/liveSentinel';

// reference values from pyproj (EPSG:4326 -> EPSG:32643)
describe('area scan: WGS84 -> UTM', () => {
  it('matches pyproj to within 1 m', () => {
    const cases: [number, number, number, number][] = [
      [28.4906, 77.2804, 723223.356, 3153670.307],
      [28.3725, 77.1723, 712875.209, 3140385.473],
      [10.0, 75.0, 500000.0, 1105412.491],
    ];
    for (const [lat, lng, e, n] of cases) {
      const [x, y] = __test.toUtm(lat, lng, 43, false);
      expect(Math.abs(x - e)).toBeLessThan(1);
      expect(Math.abs(y - n)).toBeLessThan(1);
    }
  });
  it('measures the Khori Gaon box as about 2.6 km square', () => {
    const s = areaSizeM([77.2673172, 28.4791016, 77.2934828, 28.5020984]);
    expect(s.w).toBeGreaterThan(2500);
    expect(s.w).toBeLessThan(2650);
    expect(s.h).toBeGreaterThan(2500);
    expect(s.h).toBeLessThan(2650);
  });
});
