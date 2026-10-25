/**
 * Fusion decision engine: Combines Optical (dNDVI) and SAR (dSAR) with Cloud Masking.
 */

import { THRESHOLDS } from '../config';

export type ScanMode = 'optical' | 'sar' | 'fused';

export interface FusionResult {
  changeMask: Uint8Array; // 1 = flagged change, 0 = no change
  confidenceMap: Float32Array; // 0.0 .. 1.0 confidence score per pixel
  rawChangeMask: Uint8Array; // Before false-positive rejection
  rejectedCount: number; // Pixels rejected due to seasonal vegetation filter
}

export function performFusion(
  dNDVI: Float32Array,
  dSAR: Float32Array,
  cloudMask: Uint8Array,
  mode: ScanMode,
  size: number,
  thresholds?: {
    ndviChange?: number;
    sarChangeDb?: number;
  }
): FusionResult {
  const ndviThreshold = thresholds?.ndviChange ?? THRESHOLDS.NDVI_CHANGE;
  const sarThreshold = thresholds?.sarChangeDb ?? THRESHOLDS.SAR_CHANGE_DB;

  const total = size * size;
  const changeMask = new Uint8Array(total);
  const rawChangeMask = new Uint8Array(total);
  const confidenceMap = new Float32Array(total);
  let rejectedCount = 0;

  for (let i = 0; i < total; i++) {
    const ndviDiff = dNDVI[i];
    const sarDiff = dSAR[i];
    const isCloud = cloudMask[i] === 1;

    const opticalFlag = !isCloud && ndviDiff < ndviThreshold;
    const sarFlag = Math.abs(sarDiff) > sarThreshold;

    if (mode === 'optical') {
      if (opticalFlag) {
        changeMask[i] = 1;
        rawChangeMask[i] = 1;
        confidenceMap[i] = Math.min(1.0, Math.abs(ndviDiff) * 1.8);
      }
    } else if (mode === 'sar') {
      if (sarFlag) {
        changeMask[i] = 1;
        rawChangeMask[i] = 1;
        confidenceMap[i] = Math.min(1.0, Math.abs(sarDiff) / 8.0);
      }
    } else {
      // Fused mode:
      // Case 1: Cloud covered -> fall back to SAR
      if (isCloud) {
        if (sarFlag) {
          changeMask[i] = 1;
          rawChangeMask[i] = 1;
          confidenceMap[i] = Math.min(1.0, Math.abs(sarDiff) / 8.0) * 0.9;
        }
      } else {
        // Clear sky
        if (opticalFlag) {
          rawChangeMask[i] = 1;
          // False positive check: optical change with low SAR change -> seasonal crop harvest
          if (Math.abs(sarDiff) <= THRESHOLDS.SEASONAL_SAR_MAX) {
            rejectedCount++;
            // Rejected! Do not set changeMask[i] = 1
          } else {
            // True structural change
            changeMask[i] = 1;
            const ndviWeight = Math.min(1.0, Math.abs(ndviDiff) * 1.5);
            const sarWeight = Math.min(1.0, Math.abs(sarDiff) / 6.0);
            confidenceMap[i] = Math.min(1.0, ndviWeight * 0.5 + sarWeight * 0.5);
          }
        } else if (sarFlag && Math.abs(sarDiff) > 5.0) {
          // Subtle vegetation change missed by optical or high metallic response
          changeMask[i] = 1;
          rawChangeMask[i] = 1;
          confidenceMap[i] = 0.75;
        }
      }
    }
  }

  return {
    changeMask,
    confidenceMap,
    rawChangeMask,
    rejectedCount,
  };
}
