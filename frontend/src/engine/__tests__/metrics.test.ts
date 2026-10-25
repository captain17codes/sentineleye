import { describe, it, expect } from 'vitest';
import {
  computeBBoxIoU,
  evaluateDetections,
  runBenchmarkValidation,
  THREAT_CLASSES,
} from '../scan/metrics';
import { GroundTruthScenario } from '../scan/scenarios';

describe('Validation Metrics & Empirical Model Evaluation Unit Tests', () => {
  describe('Spatial Bounding Box IoU Calculation', () => {
    it('returns 1.0 for identical bounding boxes', () => {
      const box: [number, number, number, number] = [10, 10, 30, 30];
      expect(computeBBoxIoU(box, box)).toBe(1.0);
    });

    it('returns 0.0 for completely disjoint bounding boxes', () => {
      const boxA: [number, number, number, number] = [0, 0, 10, 10];
      const boxB: [number, number, number, number] = [20, 20, 30, 30];
      expect(computeBBoxIoU(boxA, boxB)).toBe(0.0);
    });

    it('computes exact fractional IoU for 50% width overlap', () => {
      const boxA: [number, number, number, number] = [0, 0, 10, 10]; // area 100
      const boxB: [number, number, number, number] = [5, 0, 15, 10]; // area 100
      // Intersection: [5, 0, 10, 10] -> area 50
      // Union: 100 + 100 - 50 = 150
      // IoU = 50 / 150 = 1/3
      expect(computeBBoxIoU(boxA, boxB)).toBeCloseTo(1 / 3, 4);
    });
  });

  describe('Synthetic Ground-Truth Evaluation Matrix', () => {
    it('computes exact Precision, Recall, and F1 with known TP, FP, and FN counts', () => {
      const groundTruths: GroundTruthScenario[] = [
        // TP 1
        {
          id: 'gt-1',
          name: 'Quarry Pit',
          x: 50,
          y: 50,
          radius: 10,
          dNDVI: -0.45,
          dSAR: 4.0,
          expectedClass: 'Mining',
          isFalsePositive: false,
        },
        // TP 2
        {
          id: 'gt-2',
          name: 'Illegal Plinth',
          x: 100,
          y: 100,
          radius: 10,
          dNDVI: -0.40,
          dSAR: 5.0,
          expectedClass: 'Unauthorized Construction',
          isFalsePositive: false,
        },
        // FN 1 (Missed by detector)
        {
          id: 'gt-3',
          name: 'Canopy Thinning',
          x: 150,
          y: 150,
          radius: 10,
          dNDVI: -0.30,
          dSAR: -1.0,
          expectedClass: 'Deforestation',
          isFalsePositive: false,
        },
        // TN 1 (Seasonal farming correctly ignored)
        {
          id: 'gt-4',
          name: 'Wheat Crop Harvest',
          x: 200,
          y: 200,
          radius: 10,
          dNDVI: -0.35,
          dSAR: 0.5,
          expectedClass: 'Seasonal Farming',
          isFalsePositive: true,
        },
      ];

      const detections = [
        // Matches gt-1 (TP 1)
        {
          bbox: [40, 40, 60, 60] as [number, number, number, number],
          class: 'Mining',
          confidence: 0.9,
        },
        // Matches gt-2 (TP 2)
        {
          bbox: [90, 90, 110, 110] as [number, number, number, number],
          class: 'Unauthorized Construction',
          confidence: 0.85,
        },
        // False Alarm with no matching GT (FP 1)
        {
          bbox: [10, 10, 20, 20] as [number, number, number, number],
          class: 'Land Encroachment',
          confidence: 0.75,
        },
      ];

      const metrics = evaluateDetections(detections, groundTruths);

      // TP = 2, FP = 1, FN = 1, TN = 1
      expect(metrics.truePositives).toBe(2);
      expect(metrics.falsePositives).toBe(1);
      expect(metrics.falseNegatives).toBe(1);
      expect(metrics.trueNegatives).toBe(1);

      // Precision = 2 / (2 + 1) = 0.6667
      expect(metrics.precision).toBeCloseTo(2 / 3, 3);

      // Recall = 2 / (2 + 1) = 0.6667
      expect(metrics.recall).toBeCloseTo(2 / 3, 3);

      // F1 = 2 * (2/3 * 2/3) / (4/3) = 2/3
      expect(metrics.f1Score).toBeCloseTo(2 / 3, 3);

      // Mean IoU across the 2 matched detections
      expect(metrics.meanIoU).toBe(1.0);
    });

    it('produces a consistent 5x5 confusion matrix matching threat classes', () => {
      const benchmark = runBenchmarkValidation();

      expect(benchmark.confusionMatrix.classes).toEqual(THREAT_CLASSES);
      expect(benchmark.confusionMatrix.matrix.length).toBe(5);
      expect(benchmark.confusionMatrix.matrix[0].length).toBe(5);

      // Total evaluated should be 46 (38 planted + 8 false positives)
      expect(benchmark.totalEvaluated).toBe(46);
    });
  });

  describe('Threshold Sensitivity Response Curve', () => {
    it('achieves high precision and recall under operational defaults (-0.25, 2.5 dB)', () => {
      const defaultMetrics = runBenchmarkValidation({
        ndviChange: -0.25,
        sarChangeDb: 2.5,
      });

      expect(defaultMetrics.precision).toBeGreaterThanOrEqual(0.95);
      expect(defaultMetrics.recall).toBeGreaterThanOrEqual(0.95);
      expect(defaultMetrics.f1Score).toBeGreaterThanOrEqual(0.95);
    });

    it('demonstrates decreased recall when threshold is made very strict (-0.45, 5.0 dB)', () => {
      const strictMetrics = runBenchmarkValidation({
        ndviChange: -0.45,
        sarChangeDb: 5.0,
      });

      // Strict thresholds cause smaller/subtler encroachments to be missed
      expect(strictMetrics.recall).toBeLessThan(0.95);
      expect(strictMetrics.falseNegatives).toBeGreaterThan(0);
    });

    it('demonstrates decreased precision when SAR threshold is set too low (0.5 dB)', () => {
      const looseSarMetrics = runBenchmarkValidation({
        ndviChange: -0.25,
        sarChangeDb: 0.5,
      });

      // Loose SAR threshold fails to reject seasonal harvest distractors (dSAR ~ 0.7 dB)
      expect(looseSarMetrics.falsePositives).toBeGreaterThan(0);
      expect(looseSarMetrics.precision).toBeLessThan(1.0);
    });
  });
});
