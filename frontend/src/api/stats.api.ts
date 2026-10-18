import { api } from './client';

export interface RiskTotals {
  total_alerts: number;
  total_area_m2?: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  new_count: number;
  verified: number;
  notice_issued: number;
}

export interface ZoneRiskStat {
  id: number;
  name: string;
  risk_level: string;
  alert_count: number;
  total_area_m2?: number;
  risk_score: number;
}

export interface SeverityStat {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  count: number;
}

export interface DayStat {
  day: string;
  count: number;
  area_m2?: number;
}

export interface ClassStat {
  class: string;
  count: number;
  total_area_m2: number;
}

export interface ScanStats {
  total_scans: number;
  avg_change_score: number | null;
  optical: number;
  sar: number;
  fused: number;
}

export interface RiskStatsResponse {
  totals: RiskTotals;
  byZone: ZoneRiskStat[];
  bySeverity: SeverityStat[];
  byDay: DayStat[];
  byClass?: ClassStat[];
  scanStats: ScanStats;
}

export const statsApi = {
  getRiskStats: () => api.get<RiskStatsResponse>('/stats/risk'),
};
