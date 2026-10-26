export type EncroachmentClass = 'Deforestation' | 'Unauthorized Construction' | 'Mining' | 'Land Encroachment';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'New' | 'Verified' | 'Notice Issued' | 'Signed & Served';

export function formatAlertStatus(status: AlertStatus): string {
  if (status === 'Notice Issued') return 'Notice Drafted — Pending Officer Signature';
  return status;
}

export interface AuditEntry {
  timestamp: string;
  status: AlertStatus;
  operator: string;
  note: string;
  block_hash: string;
  block_index: number;
}

export interface Alert {
  id: number;
  scan_id: number | null;
  zone_id: number;
  class: EncroachmentClass;
  severity: AlertSeverity;
  status: AlertStatus;
  lat: number;
  lng: number;
  area_m2: number;
  overlap_pct: number;
  before_img: string;
  after_img: string;
  description: string;
  created_at: string;
  zone_name?: string;
  risk_level?: string;
  case_id?: number;
  case_ref?: string;
  ledger_hash?: string;
  confidence?: number;
  ndvi_delta?: number;
  sar_delta?: number;
  t0_timestamp?: string;
  t1_timestamp?: string;
  audit_trail?: AuditEntry[];
  is_real_scene?: boolean;
  data_source?: 'calibration' | 'real';
  /** real Copernicus product IDs, present only for alerts from real Sentinel-2 crops */
  t0_scene_id?: string;
  t1_scene_id?: string;
}

export interface AlertsResponse {
  alerts: Alert[];
  total: number;
  page: number;
  limit: number;
}
