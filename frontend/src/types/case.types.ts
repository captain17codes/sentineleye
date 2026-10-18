export interface Case {
  id: number;
  alert_id: number;
  case_ref: string;
  created_by: number;
  created_at: string;
  ledger_hash: string;
  lat?: number;
  lng?: number;
  class?: string;
  area_m2?: number;
  overlap_pct?: number;
  before_img?: string;
  after_img?: string;
  severity?: string;
  description?: string;
  zone_name?: string;
  alert_status?: string;
  created_by_email?: string;
  operator_email?: string;
}

export interface CaseHistory {
  id: number;
  alert_id: number;
  status: string;
  changed_by: number;
  changed_at: string;
  notes: string;
  operator_email?: string;
}
