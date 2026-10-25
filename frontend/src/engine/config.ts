/**
 * SentinelEye Engine Configuration
 * Single source of truth for all thresholds, seeds, and rules.
 */

export const DEMO_SEED = 42;

// ── Detection Thresholds ───────────────────────────────────────────────────
export const THRESHOLDS = {
  NDVI_CHANGE: -0.25,       // dNDVI < this → vegetation loss flag
  SAR_CHANGE_DB: 3.0,       // |dSAR| > this dB → structural change flag
  MIN_AREA_M2: 500,          // minimum blob area to produce an alert
  MIN_OVERLAP_PCT: 0.35,    // overlap fraction required to create an alert
  SEASONAL_SAR_MAX: 1.5,    // if SAR change is below this, it is seasonal only
} as const;

// ── Severity Rules ─────────────────────────────────────────────────────────
export const SEVERITY_RULES = {
  CRITICAL_OVERLAP: 0.85,   // > 85% overlap in core zone → CRITICAL
  HIGH_SAR_DB: 5.0,         // SAR increase > 5dB (concrete/mining) → HIGH
  MEDIUM_OVERLAP: 0.55,     // 55%–85% → MEDIUM
} as const;

// ── Escalation Timings (ms in simulated time) ──────────────────────────────
export const ESCALATION = {
  NEW_TO_VERIFIED_MS: 15 * 60 * 1000,       // T+15 minutes
  VERIFIED_TO_NOTICE_MS: 4 * 60 * 60 * 1000, // T+4 hours
} as const;

// ── Scene Dimensions ───────────────────────────────────────────────────────
export const SCENE = {
  SIZE: 256,
  METERS_PER_PIXEL: 10, // ~Sentinel-2 10m resolution
} as const;

// ── Alert Store ────────────────────────────────────────────────────────────
export const STORE_VERSION = 'v4';
export const STORAGE_KEYS = {
  ALERTS: `sentineleye_alerts_${STORE_VERSION}`,
  LEDGER: `sentineleye_ledger_${STORE_VERSION}`,
  ANCHOR: `sentineleye_chain_anchor_${STORE_VERSION}`,
  OPERATOR_KEY: `sentineleye_operator_key_${STORE_VERSION}`,
  USER: 'sentineleye_active_user',
  REGISTERED: 'sentineleye_registered_users',
} as const;

// ── Target seed alert distribution (38 total) ──────────────────────────────
export const TARGET_DISTRIBUTION = {
  CRITICAL: 6,
  HIGH: 14,
  MEDIUM: 11,
  LOW: 7,
} as const;
