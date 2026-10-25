import { SEEDED_ZONES } from './seededData';
import { ZoneCollection } from '../types/zone.types';
import { AlertsResponse, Alert, AlertStatus } from '../types/alert.types';
import { RiskStatsResponse } from './stats.api';
import { AuthResponse, User } from '../types/auth.types';
import { getAlerts, updateAlertStatus, addAlert } from '../engine/store/alertStore';
import {
  computeTotals,
  severityDistribution,
  trend30d,
  alertsByZone,
} from '../engine/selectors';

const STORAGE_KEYS = {
  USER: 'sentineleye_active_user',
  REGISTERED: 'sentineleye_registered_users',
  SCANS: 'sentineleye_scans_v1',
};

export async function handleMockRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const method = (options?.method || 'GET').toUpperCase();
  const urlObj = new URL(path, 'http://localhost');
  const pathname = urlObj.pathname.replace(/^\/api/, '');
  const searchParams = urlObj.searchParams;

  // 1. Auth: POST /auth/login
  if (pathname === '/auth/login' && method === 'POST') {
    const body = options?.body ? JSON.parse(options.body as string) : {};
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    let user: User | null = null;

    // Demo account
    if (email === 'operator@sentineleye.com' && password === 'operator123') {
      user = {
        id: 1,
        email: 'operator@sentineleye.com',
        role: 'operator',
        created_at: '2024-01-01T00:00:00Z',
      };
    } else {
      // Check registered users in localStorage
      try {
        const registered = JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTERED) || '[]');
        const found = registered.find((u: any) => u.email.toLowerCase() === email && u.password === password);
        if (found) {
          user = { id: found.id, email: found.email, role: 'operator', created_at: found.created_at };
        }
      } catch {}
    }

    if (!user) {
      throw new Error('Invalid email or password. Use demo account: operator@sentineleye.com / operator123');
    }

    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    return { user, token: 'sentineleye-simulated-jwt' } as unknown as T;
  }

  // 2. Auth: POST /auth/register
  if (pathname === '/auth/register' && method === 'POST') {
    const body = options?.body ? JSON.parse(options.body as string) : {};
    const email = (body.email || '').trim();
    const password = body.password || '';

    if (!email || !password) throw new Error('Email and password required.');

    const newUser: User = {
      id: Date.now(),
      email,
      role: 'operator', // strictly operator
      created_at: new Date().toISOString(),
    };

    try {
      const registered = JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTERED) || '[]');
      registered.push({ ...newUser, password });
      localStorage.setItem(STORAGE_KEYS.REGISTERED, JSON.stringify(registered));
    } catch {}

    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
    return { user: newUser, token: 'sentineleye-simulated-jwt' } as unknown as T;
  }

  // 3. Auth: GET /auth/me
  if (pathname === '/auth/me' && method === 'GET') {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) {
      throw new Error('Unauthorized');
    }
    return { user: JSON.parse(raw) } as unknown as T;
  }

  // 4. Auth: POST /auth/logout
  if (pathname === '/auth/logout' && method === 'POST') {
    localStorage.removeItem(STORAGE_KEYS.USER);
    return { message: 'Logged out successfully' } as unknown as T;
  }

  // 5. Zones: GET /zones
  if (pathname === '/zones' && method === 'GET') {
    const features = SEEDED_ZONES.map((z) => ({
      ...JSON.parse(z.geojson),
      properties: { id: z.id, name: z.name, risk_level: z.risk_level, created_at: z.created_at },
    }));
    return { type: 'FeatureCollection', features } as unknown as T;
  }

  // 6. Alerts: GET /alerts
  if (pathname === '/alerts' && method === 'GET') {
    let alerts = getAlerts();
    const zone = searchParams.get('zone');
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));

    if (zone) alerts = alerts.filter((a) => String(a.zone_id) === zone);
    if (severity) alerts = alerts.filter((a) => a.severity === severity);
    if (status) alerts = alerts.filter((a) => a.status === status);

    const total = alerts.length;
    const offset = (page - 1) * limit;
    const paginated = alerts.slice(offset, offset + limit);

    return { alerts: paginated, total, page, limit } as unknown as T;
  }

  // 7. Alert Status Patch: PATCH /alerts/:id/status
  if (pathname.match(/^\/alerts\/\d+\/status$/) && method === 'PATCH') {
    const id = parseInt(pathname.split('/')[2], 10);
    const body = options?.body ? JSON.parse(options.body as string) : {};
    if (body.status) {
      updateAlertStatus(id, body.status as AlertStatus, body.notes);
    }
    const alert = getAlerts().find((a) => a.id === id);
    return (alert || {}) as unknown as T;
  }

  // 8. Stats: GET /stats/risk
  if (pathname === '/stats/risk' && method === 'GET') {
    const alerts = getAlerts();
    const totals = computeTotals(alerts);
    const bySeverity = severityDistribution(alerts);
    const byZone = alertsByZone(alerts, SEEDED_ZONES);
    const byDay = trend30d(alerts);

    // Group by class
    const classMap: Record<string, { count: number; area: number }> = {};
    alerts.forEach((a) => {
      const cls = a.class || 'Land Encroachment';
      if (!classMap[cls]) classMap[cls] = { count: 0, area: 0 };
      classMap[cls].count++;
      classMap[cls].area += (a.area_m2 || 0);
    });
    const byClass = Object.entries(classMap).map(([cls, val]) => ({
      class: cls,
      count: val.count,
      total_area_m2: val.area,
    }));

    const scanStats = {
      total_scans: 14,
      avg_change_score: 0.54,
      optical: 7,
      sar: 4,
      fused: 3,
    };

    return { totals, byClass, byZone, bySeverity, byDay, scanStats } as unknown as T;
  }

  // 9. Scans: POST /scans
  if (pathname === '/scans' && method === 'POST') {
    const body = options?.body ? JSON.parse(options.body as string) : {};
    const alerts = getAlerts();
    const newId = alerts.length > 0 ? Math.max(...alerts.map((a) => a.id)) + 1 : 1;

    const newAlert: Alert = {
      id: newId,
      scan_id: Date.now(),
      zone_id: body.zone_id || 1,
      zone_name: SEEDED_ZONES.find((z) => z.id === body.zone_id)?.name || 'Aravalli Forest Reserve Alpha',
      class: body.validated_classes?.[0]?.class || body.raw_classes?.[0]?.class || 'Land Encroachment',
      severity: (body.change_score >= 0.8 ? 'CRITICAL' : body.change_score >= 0.6 ? 'HIGH' : body.change_score >= 0.4 ? 'MEDIUM' : 'LOW') as any,
      status: 'New',
      lat: body.lat || 28.52,
      lng: body.lng || 77.08,
      area_m2: body.validated_classes?.[0]?.area_m2 || 3850,
      overlap_pct: body.validated_classes?.[0]?.overlap_pct || 86.4,
      before_img: body.before_img || '/evidence/before.webp',
      after_img: body.after_img || '/evidence/after.webp',
      description: `[SIMULATED] Orbital change detected with score ${(body.change_score * 100).toFixed(1)}%`,
      created_at: new Date().toISOString(),
    };

    addAlert(newAlert);

    return {
      scan: { id: Date.now(), ...body, created_at: new Date().toISOString() },
      alertCreated: true,
      alertId: newId,
    } as unknown as T;
  }

  // 10. Cases: POST /cases
  if (pathname === '/cases' && method === 'POST') {
    const body = options?.body ? JSON.parse(options.body as string) : {};
    const caseRef = `FIR-${Date.now().toString().slice(-6)}`;
    const hash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    return {
      id: Date.now(),
      alert_id: body.alert_id,
      case_ref: caseRef,
      ledger_hash: hash,
      created_at: new Date().toISOString(),
    } as unknown as T;
  }

  // 11. Cases PDF: GET /cases/:id/pdf
  if (pathname.includes('/pdf')) {
    // Generate simple simulated text blob as fallback
    const dummyBlob = new Blob([`%PDF-1.4 SentinelEye Legal Notice FIR #${pathname}`], { type: 'application/pdf' });
    return dummyBlob as unknown as T;
  }

  // 12. Ledger: GET /ledger/verify
  if (pathname.includes('/ledger')) {
    return { valid: true, blocksVerified: 38, lastHash: '0x8f2a93c7d4e1...' } as unknown as T;
  }

  // 13. Notifications: GET /notifications
  if (pathname.includes('/notifications')) {
    return [
      { id: 1, type: 'alert', message: '[SIMULATED] Critical alert created for Aravalli Sector 4', created_at: new Date().toISOString() },
      { id: 2, type: 'info', message: '[SIMULATED] Copernicus Sentinel-2 pass synchronized', created_at: new Date().toISOString() },
    ] as unknown as T;
  }

  // Default fallback empty object
  return {} as unknown as T;
}
