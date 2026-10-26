// Loads a site crop written by tools/fetch_real_sentinel.py (or the older
// calibrated/synthetic files) and turns it into pipeline input.
//
// A crop is REAL only when the file says so (`source.kind === "REAL"`).
// Everything else is treated as the calibrated synthetic arrays it is.

import type { RealSceneMetadata } from '../../types/scan.types';

export interface SiteSceneFile {
  scene_id: string;
  datetime: string;
  cloud_cover?: number;
  size?: number;
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat] of the AOI crop
  red: number[];
  nir: number[];
  sar: number[];
  scl?: number[];
  sar_available?: boolean;
  is_control?: boolean;
  source?: {
    kind?: string;
    optical?: string;
    optical_item?: string;
    mgrs_grid?: string | null;
    processing_baseline?: string | null;
    sar?: string | null;
    note?: string;
  };
}

export interface GeoBbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export type SensorMode = 'optical' | 'sar' | 'fused';

// Sentinel-2 SCL classes treated as unusable:
// 0 no data, 1 saturated, 3 cloud shadow, 8/9 cloud, 10 thin cirrus
export const BAD_SCL = new Set([0, 1, 3, 8, 9, 10]);

export const SYNTHETIC_SITE_LABEL = 'Calibrated scenes modeled on real sites (synthetic arrays)';

export function realSiteLabel(t0: SiteSceneFile): string {
  return `REAL — Copernicus Sentinel-2 L2A (${t0.source?.optical ?? 'Earth Search STAC'})`;
}

export interface PreparedSiteScene {
  isRealData: boolean;
  sarAvailable: boolean;
  bbox: GeoBbox | null;
  effectiveMode: SensorMode;
  cloudMask: Uint8Array;
  scene: {
    t0: { red: Float32Array; nir: Float32Array; sar: Float32Array };
    t1: { red: Float32Array; nir: Float32Array; sar: Float32Array };
  };
  metadata: RealSceneMetadata;
}

export function prepareSiteScene(
  t0: SiteSceneFile,
  t1: SiteSceneFile,
  requestedMode: SensorMode,
  size: number,
  zoneId: number
): PreparedSiteScene {
  const n = size * size;
  if (t0.red.length !== n || t1.red.length !== n || t0.nir.length !== n || t1.nir.length !== n) {
    throw new Error(`Site scene arrays must be ${size}x${size}`);
  }

  const isRealData = t0.source?.kind === 'REAL' && t1.source?.kind === 'REAL';
  // Older calibrated files have no flag and always carry SAR arrays.
  const sarAvailable = t0.sar_available !== false && t1.sar_available !== false;

  // Cloud/shadow/no-data in EITHER date makes the optical comparison invalid.
  const cloudMask = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const a = t0.scl ? t0.scl[i] : 4;
    const b = t1.scl ? t1.scl[i] : 4;
    if (BAD_SCL.has(a) || BAD_SCL.has(b)) cloudMask[i] = 1;
  }
  // Older synthetic files only masked T1, with a smaller class set; keep that behaviour for them.
  if (!isRealData) {
    for (let i = 0; i < n; i++) {
      const s = t1.scl ? t1.scl[i] : 4;
      cloudMask[i] = s === 3 || s === 8 || s === 9 || s === 10 ? 1 : 0;
    }
  }

  const bbox: GeoBbox | null =
    t0.bbox && t0.bbox.length === 4
      ? { minLng: t0.bbox[0], minLat: t0.bbox[1], maxLng: t0.bbox[2], maxLat: t0.bbox[3] }
      : null;

  // Without real SAR, never let the zero-filled radar channel influence a decision.
  const effectiveMode: SensorMode = sarAvailable ? requestedMode : 'optical';
  const zeros = new Float32Array(n);

  return {
    isRealData,
    sarAvailable,
    bbox,
    effectiveMode,
    cloudMask,
    scene: {
      t0: { red: new Float32Array(t0.red), nir: new Float32Array(t0.nir), sar: sarAvailable ? new Float32Array(t0.sar) : zeros },
      t1: { red: new Float32Array(t1.red), nir: new Float32Array(t1.nir), sar: sarAvailable ? new Float32Array(t1.sar) : zeros },
    },
    metadata: {
      t0SceneId: t0.scene_id,
      t1SceneId: t1.scene_id,
      t0Date: t0.datetime,
      t1Date: t1.datetime,
      telemetrySource: isRealData ? realSiteLabel(t0) : SYNTHETIC_SITE_LABEL,
      isControl: t0.is_control === true || (!isRealData && zoneId === 107),
      isRealData,
      sarAvailable,
      mgrsGrid: t0.source?.mgrs_grid ?? undefined,
      t0CloudPct: t0.cloud_cover,
      t1CloudPct: t1.cloud_cover,
      aoiBbox: t0.bbox,
    },
  };
}
