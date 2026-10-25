export type EncroachmentClass = 'Deforestation' | 'Unauthorized Construction' | 'Mining' | 'Land Encroachment';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'New' | 'Verified' | 'Notice Issued';

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
}

export interface AlertsResponse {
  alerts: Alert[];
  total: number;
  page: number;
  limit: number;
}
