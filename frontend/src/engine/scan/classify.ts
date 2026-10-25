/**
 * Classification and Severity assignment rules for detected change blobs.
 */

import { OverlayResult } from './overlay';
import { Severity } from '../../types/alert.types';

export type DetectedClass = 'Unauthorized Construction' | 'Mining' | 'Deforestation' | 'Land Encroachment';

export interface ClassifiedDetection {
  id: number;
  class: DetectedClass;
  severity: Severity;
  confidence: number;
  areaM2: number;
  overlapPct: number;
  centroid: [number, number];
  coordinates: [number, number][];
  meanNdviDiff: number;
  meanSarDiff: number;
  statutoryAct: string;
  statutorySection: string;
}

export function classifyDetection(overlay: OverlayResult): ClassifiedDetection {
  const { blob, overlapPct } = overlay;
  const dNDVI = blob.meanNdviDiff;
  const dSAR = blob.meanSarDiff;
  const maxSAR = blob.maxSarDiff ?? dSAR;

  let assignedClass: DetectedClass = 'Land Encroachment';
  let act = 'Public Premises (Eviction of Unauthorised Occupants) Act, 1971';
  let section = 'Section 4 & Section 5';

  if (maxSAR >= 4.5 || dSAR >= 3.6) {
    assignedClass = 'Unauthorized Construction';
    act = 'Delhi Development Act, 1957 / Public Premises Act, 1971';
    section = 'Section 30 & Section 31A';
  } else if ((maxSAR >= 3.2 || dSAR >= 2.4) && dNDVI <= -0.32) {
    assignedClass = 'Mining';
    act = 'Mines and Minerals (Development and Regulation) Act, 1957';
    section = 'Section 4(1) & Section 21';
  } else if (dNDVI <= -0.35 && maxSAR <= 3.2) {
    assignedClass = 'Deforestation';
    act = 'Indian Forest Act, 1927 / Forest (Conservation) Act, 1980';
    section = 'Section 26 & Section 2';
  }

  // Severity assignment based on statutory severity and calibrated physical footprint
  let severity: Severity = 'LOW';
  if (blob.areaM2 >= 10500) {
    severity = 'CRITICAL';
  } else if (blob.areaM2 >= 5500 || assignedClass === 'Unauthorized Construction' || (assignedClass === 'Mining' && blob.areaM2 >= 4500)) {
    severity = 'HIGH';
  } else if (blob.areaM2 >= 2800) {
    severity = 'MEDIUM';
  } else {
    severity = 'LOW';
  }

  return {
    id: blob.id,
    class: assignedClass,
    severity,
    confidence: Number(blob.meanConfidence.toFixed(2)),
    areaM2: Math.round(blob.areaM2),
    overlapPct,
    centroid: blob.centroid,
    coordinates: blob.coordinates,
    meanNdviDiff: Number(dNDVI.toFixed(3)),
    meanSarDiff: Number(dSAR.toFixed(2)),
    statutoryAct: act,
    statutorySection: section,
  };
}
