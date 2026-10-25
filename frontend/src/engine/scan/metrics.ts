/**
 * metrics.ts — Validation Metrics & Empirical Model Evaluation.
 * 
 * Computes:
 *   - Precision, Recall, F1 Score
 *   - Mean Spatial IoU (Intersection-over-Union)
 *   - 5x5 Multi-Class Confusion Matrix (Construction, Mining, Deforestation, Land Encroachment, None / Seasonal)
 *   - Sensitivity response curves for dNDVI and dSAR threshold tuning.
 */

import { ZONE_SCENARIOS, GroundTruthScenario } from './scenarios';
import { THRESHOLDS } from '../config';

export const THREAT_CLASSES = [
  'Deforestation',
  'Unauthorized Construction',
  'Mining',
  'Land Encroachment',
  'None / Seasonal',
] as const;

export type ThreatClass = (typeof THREAT_CLASSES)[number];

export interface ConfusionMatrix {
  classes: readonly ThreatClass[];
  // matrix[actualIndex][predictedIndex]
  matrix: number[][];
  actualTotals: Record<ThreatClass, number>;
  predictedTotals: Record<ThreatClass, number>;
}

export interface ClassPerformance {
  class: ThreatClass;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface ValidationMetrics {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  precision: number; // 0.0 .. 1.0
  recall: number; // 0.0 .. 1.0
  f1Score: number; // 0.0 .. 1.0
  meanIoU: number; // 0.0 .. 1.0
  totalEvaluated: number;
  confusionMatrix: ConfusionMatrix;
  classBreakdown: Record<ThreatClass, ClassPerformance>;
}

export interface ThresholdSettings {
  ndviChange: number; // e.g. -0.25 (range: -0.45 to -0.15)
  sarChangeDb: number; // e.g. 2.5 dB (range: 1.0 to 6.0)
}

/**
 * Computes axis-aligned bounding box Intersection-over-Union (IoU).
 * Format: [minX, minY, maxX, maxY]
 */
export function computeBBoxIoU(
  boxA: [number, number, number, number],
  boxB: [number, number, number, number]
): number {
  const xA = Math.max(boxA[0], boxB[0]);
  const yA = Math.max(boxA[1], boxB[1]);
  const xB = Math.min(boxA[2], boxB[2]);
  const yB = Math.min(boxA[3], boxB[3]);

  const interWidth = Math.max(0, xB - xA);
  const interHeight = Math.max(0, yB - yA);
  const interArea = interWidth * interHeight;

  const areaA = Math.max(0, boxA[2] - boxA[0]) * Math.max(0, boxA[3] - boxA[1]);
  const areaB = Math.max(0, boxB[2] - boxB[0]) * Math.max(0, boxB[3] - boxB[1]);
  const unionArea = areaA + areaB - interArea;

  if (unionArea <= 0) return 0;
  return interArea / unionArea;
}

/**
 * Maps raw string classes to the 5 standard ThreatClass labels.
 */
export function normalizeThreatClass(rawClass: string): ThreatClass {
  if (rawClass === 'Deforestation') return 'Deforestation';
  if (rawClass === 'Unauthorized Construction') return 'Unauthorized Construction';
  if (rawClass === 'Mining') return 'Mining';
  if (rawClass === 'Land Encroachment') return 'Land Encroachment';
  return 'None / Seasonal';
}

/**
 * Builds an initialized 5x5 confusion matrix structure.
 */
function createEmptyConfusionMatrix(): ConfusionMatrix {
  const size = THREAT_CLASSES.length;
  const matrix: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  const actualTotals = {} as Record<ThreatClass, number>;
  const predictedTotals = {} as Record<ThreatClass, number>;

  for (const c of THREAT_CLASSES) {
    actualTotals[c] = 0;
    predictedTotals[c] = 0;
  }

  return {
    classes: THREAT_CLASSES,
    matrix,
    actualTotals,
    predictedTotals,
  };
}

/**
 * Record an observation in the confusion matrix.
 */
function recordObservation(
  cm: ConfusionMatrix,
  actual: ThreatClass,
  predicted: ThreatClass
): void {
  const actualIdx = THREAT_CLASSES.indexOf(actual);
  const predIdx = THREAT_CLASSES.indexOf(predicted);

  if (actualIdx >= 0 && predIdx >= 0) {
    cm.matrix[actualIdx][predIdx]++;
    cm.actualTotals[actual]++;
    cm.predictedTotals[predicted]++;
  }
}

/**
 * Computes empirical precision, recall, F1, IoU, and confusion matrix from detections
 * and known ground truth scenarios.
 */
export function evaluateDetections(
  detections: Array<{
    bbox: [number, number, number, number];
    class: string;
    confidence?: number;
  }>,
  groundTruths: GroundTruthScenario[]
): ValidationMetrics {
  const cm = createEmptyConfusionMatrix();
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let trueNegatives = 0;
  const matchedIoUs: number[] = [];

  const unmatchedDetections = new Set(detections.map((_, i) => i));

  // 1. Evaluate each ground truth scenario
  for (const gt of groundTruths) {
    const gtBox: [number, number, number, number] = [
      gt.x - gt.radius,
      gt.y - gt.radius,
      gt.x + gt.radius,
      gt.y + gt.radius,
    ];
    const actualClass = gt.isFalsePositive
      ? 'None / Seasonal'
      : normalizeThreatClass(gt.expectedClass);

    // Find best overlapping detection
    let bestIoU = 0;
    let bestDetIdx = -1;

    unmatchedDetections.forEach((detIdx) => {
      const det = detections[detIdx];
      const iou = computeBBoxIoU(gtBox, det.bbox);
      if (iou > bestIoU) {
        bestIoU = iou;
        bestDetIdx = detIdx;
      }
    });

    const isMatch = bestDetIdx !== -1 && bestIoU >= 0.15;

    if (gt.isFalsePositive) {
      if (isMatch) {
        // A false positive scenario was falsely detected by the engine!
        falsePositives++;
        unmatchedDetections.delete(bestDetIdx);
        const predClass = normalizeThreatClass(detections[bestDetIdx].class);
        recordObservation(cm, 'None / Seasonal', predClass);
      } else {
        // Correctly ignored/filtered
        trueNegatives++;
        recordObservation(cm, 'None / Seasonal', 'None / Seasonal');
      }
    } else {
      if (isMatch) {
        // Valid detection
        truePositives++;
        matchedIoUs.push(bestIoU);
        unmatchedDetections.delete(bestDetIdx);
        const predClass = normalizeThreatClass(detections[bestDetIdx].class);
        recordObservation(cm, actualClass, predClass);
      } else {
        // Ground truth missed by detector
        falseNegatives++;
        recordObservation(cm, actualClass, 'None / Seasonal');
      }
    }
  }

  // 2. Any leftover detections with no matching ground truth are False Positives
  unmatchedDetections.forEach((detIdx) => {
    falsePositives++;
    const predClass = normalizeThreatClass(detections[detIdx].class);
    recordObservation(cm, 'None / Seasonal', predClass);
  });

  // 3. Compute aggregate statistics
  const precision = truePositives + falsePositives > 0
    ? truePositives / (truePositives + falsePositives)
    : 1.0;

  const recall = truePositives + falseNegatives > 0
    ? truePositives / (truePositives + falseNegatives)
    : 1.0;

  const f1Score = precision + recall > 0
    ? (2 * precision * recall) / (precision + recall)
    : 0.0;

  const meanIoU = matchedIoUs.length > 0
    ? matchedIoUs.reduce((sum, v) => sum + v, 0) / matchedIoUs.length
    : 0.0;

  // 4. Per-Class Breakdown
  const classBreakdown = {} as Record<ThreatClass, ClassPerformance>;
  for (const c of THREAT_CLASSES) {
    const idx = THREAT_CLASSES.indexOf(c);
    const tp = cm.matrix[idx][idx];
    const fp = cm.predictedTotals[c] - tp;
    const fn = cm.actualTotals[c] - tp;
    const p = tp + fp > 0 ? tp / (tp + fp) : 1.0;
    const r = tp + fn > 0 ? tp / (tp + fn) : 1.0;
    const f1 = p + r > 0 ? (2 * p * r) / (p + r) : 0.0;

    classBreakdown[c] = {
      class: c,
      truePositives: tp,
      falsePositives: fp,
      falseNegatives: fn,
      precision: p,
      recall: r,
      f1,
    };
  }

  return {
    truePositives,
    falsePositives,
    falseNegatives,
    trueNegatives,
    precision,
    recall,
    f1Score,
    meanIoU,
    totalEvaluated: groundTruths.length,
    confusionMatrix: cm,
    classBreakdown,
  };
}

/**
 * Runs a simulated benchmark across all 38 ground-truth scenarios (or a specific zone)
 * under specified sensitivity thresholds. Enables live threshold exploration with zero worker latency.
 */
export function runBenchmarkValidation(
  thresholds: ThresholdSettings = {
    ndviChange: THRESHOLDS.NDVI_CHANGE,
    sarChangeDb: THRESHOLDS.SAR_CHANGE_DB,
  },
  zoneId?: number
): ValidationMetrics {
  const candidateScenarios: GroundTruthScenario[] = [];

  if (zoneId && ZONE_SCENARIOS[zoneId]) {
    candidateScenarios.push(...ZONE_SCENARIOS[zoneId]);
  } else {
    for (const id in ZONE_SCENARIOS) {
      candidateScenarios.push(...ZONE_SCENARIOS[id]);
    }
  }

  // Simulate pipeline detection logic with the given thresholds
  const simulatedDetections: Array<{
    bbox: [number, number, number, number];
    class: string;
    confidence: number;
  }> = [];

  for (const sc of candidateScenarios) {
    // 1. Spatial resolution filter (< 5px filtered)
    if (sc.radius < 3.5) continue;

    // 2. Optical change threshold check
    const opticalFlag = sc.dNDVI < thresholds.ndviChange;

    // 3. SAR change threshold check
    const sarFlag = Math.abs(sc.dSAR) > thresholds.sarChangeDb;

    // 4. Fusion decision logic
    let detected = false;
    let detectedClass: ThreatClass = 'None / Seasonal';

    if (sc.isFalsePositive) {
      // Seasonal agriculture has optical loss, but very low SAR backscatter (< 1.0 dB)
      if (opticalFlag) {
        // If SAR threshold is set low enough (e.g. <= 0.7 dB), false alarm leaks through!
        if (Math.abs(sc.dSAR) > thresholds.sarChangeDb) {
          detected = true;
          detectedClass = 'Land Encroachment'; // Leaked false positive
        }
      }
    } else {
      // True encroachment scenario
      if (opticalFlag && sarFlag) {
        detected = true;
        detectedClass = normalizeThreatClass(sc.expectedClass);
      } else if (sc.isUnderCloudTarget && sarFlag) {
        // Caught by SAR penetration through cloud cover!
        detected = true;
        detectedClass = normalizeThreatClass(sc.expectedClass);
      } else if (opticalFlag && sc.expectedClass === 'Deforestation' && sc.dSAR < -0.8) {
        // Volume scattering reduction from canopy loss
        detected = true;
        detectedClass = 'Deforestation';
      }
    }

    if (detected) {
      // Synthetic IoU jitter around true scenario position
      const bboxJitter = 1.5;
      simulatedDetections.push({
        bbox: [
          sc.x - sc.radius - bboxJitter,
          sc.y - sc.radius - bboxJitter,
          sc.x + sc.radius + bboxJitter,
          sc.y + sc.radius + bboxJitter,
        ],
        class: detectedClass,
        confidence: 0.85 + Math.min(0.14, Math.abs(sc.dNDVI) * 0.2),
      });
    }
  }

  return evaluateDetections(simulatedDetections, candidateScenarios);
}
