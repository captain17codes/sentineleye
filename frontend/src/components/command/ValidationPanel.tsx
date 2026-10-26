import React, { useState, useMemo } from 'react';
import {
  runBenchmarkValidation,
  evaluateDetections,
  ThresholdSettings,
  THREAT_CLASSES,
  ThreatClass,
  ValidationMetrics,
} from '../../engine/scan/metrics';
import { THRESHOLDS } from '../../engine/config';
import { Sliders, CheckCircle2, AlertCircle, BarChart3, RotateCcw, Target, Layers } from 'lucide-react';
import { DetectionBlob } from '../../types/scan.types';
import { ZONE_SCENARIOS } from '../../engine/scan/scenarios';

interface ValidationPanelProps {
  zoneId?: number;
  liveDetections?: DetectionBlob[];
  onThresholdsChange?: (thresholds: ThresholdSettings) => void;
}

export function ValidationPanel({
  zoneId,
  liveDetections,
  onThresholdsChange,
}: ValidationPanelProps) {
  const [scope, setScope] = useState<'zone' | 'benchmark'>('benchmark');
  const [ndviThreshold, setNdviThreshold] = useState<number>(THRESHOLDS.NDVI_CHANGE);
  const [sarThreshold, setSarThreshold] = useState<number>(THRESHOLDS.SAR_CHANGE_DB);

  const thresholds: ThresholdSettings = useMemo(
    () => ({
      ndviChange: ndviThreshold,
      sarChangeDb: sarThreshold,
    }),
    [ndviThreshold, sarThreshold]
  );

  const handleNdviChange = (val: number) => {
    setNdviThreshold(val);
    onThresholdsChange?.({ ndviChange: val, sarChangeDb: sarThreshold });
  };

  const handleSarChange = (val: number) => {
    setSarThreshold(val);
    onThresholdsChange?.({ ndviChange: ndviThreshold, sarChangeDb: val });
  };

  const handleReset = () => {
    setNdviThreshold(THRESHOLDS.NDVI_CHANGE);
    setSarThreshold(THRESHOLDS.SAR_CHANGE_DB);
    onThresholdsChange?.({
      ndviChange: THRESHOLDS.NDVI_CHANGE,
      sarChangeDb: THRESHOLDS.SAR_CHANGE_DB,
    });
  };

  // Compute metrics dynamically
  const metrics: ValidationMetrics = useMemo(() => {
    if (scope === 'zone' && zoneId && liveDetections && liveDetections.length > 0) {
      const zoneGt = ZONE_SCENARIOS[zoneId] || [];
      const dets = liveDetections.map((d) => ({
        bbox: d.bbox,
        class: d.class,
        confidence: d.confidence,
      }));
      return evaluateDetections(dets, zoneGt);
    }
    return runBenchmarkValidation(thresholds, scope === 'zone' ? zoneId : undefined);
  }, [thresholds, scope, zoneId, liveDetections]);

  const cm = metrics.confusionMatrix;

  const formatPct = (val: number) => `${(val * 100).toFixed(1)}%`;

  return (
    <div className="p-5 rounded-lg bg-[#121212] border border-[#2e2e2e] flex flex-col gap-5 shadow-xl select-none">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2e2e2e]">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#facc15]" />
          <div>
            <h3 className="text-sm font-semibold text-[#f5f5f0]">
              Empirical Validation & Model Sensitivity
            </h3>
            <p className="text-xs text-[#b5b5ad]">
              Ground-truth verification across 38 planted spatial scenarios & calibrated synthetic arrays modeled on real sites
            </p>
          </div>
        </div>

        {/* Scope Toggle: Active Zone vs All 8 Zones */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#0a0a0a] border border-[#2e2e2e] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setScope('benchmark')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
              scope === 'benchmark'
                ? 'bg-[#1a1a1a] text-[#facc15] border border-[#facc15]/40 font-semibold'
                : 'text-[#b5b5ad] hover:text-[#f5f5f0]'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Full Benchmark (38 Scenes)</span>
          </button>
          <button
            type="button"
            onClick={() => setScope('zone')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
              scope === 'zone'
                ? 'bg-[#1a1a1a] text-[#facc15] border border-[#facc15]/40 font-semibold'
                : 'text-[#b5b5ad] hover:text-[#f5f5f0]'
            }`}
          >
            <Target className="w-3 h-3" />
            <span>Active Sector (Z-{zoneId || 102})</span>
          </button>
        </div>
      </div>

      {/* Threshold Sensitivity Sliders */}
      <div className="p-4 rounded-lg bg-[#1a1a1a] border border-[#2e2e2e] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#f5f5f0] flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#facc15]" />
            Dual-Sensor Decision Threshold Sensitivity
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="text-[11px] text-[#8f8f86] hover:text-[#facc15] flex items-center gap-1 transition-colors"
            title="Reset to operational defaults"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Defaults</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* NDVI Slider */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#b5b5ad] font-medium">Optical Vegetation Loss (ΔNDVI):</span>
              <span className="font-mono text-[#facc15] font-semibold">
                {ndviThreshold.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="-0.45"
              max="-0.15"
              step="0.01"
              value={ndviThreshold}
              onChange={(e) => handleNdviChange(parseFloat(e.target.value))}
              className="w-full accent-[#facc15] bg-[#0a0a0a] rounded-lg cursor-pointer h-1.5"
            />
            <div className="flex justify-between text-[10px] text-[#8f8f86] font-mono">
              <span>-0.45 (Strict / Large clearing)</span>
              <span>Default: -0.25</span>
              <span>-0.15 (High sensitivity)</span>
            </div>
          </div>

          {/* SAR Slider */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#b5b5ad] font-medium">Radar Double-Bounce Diff (ΔSAR):</span>
              <span className="font-mono text-[#facc15] font-semibold">
                +{sarThreshold.toFixed(1)} dB
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="6.0"
              step="0.1"
              value={sarThreshold}
              onChange={(e) => handleSarChange(parseFloat(e.target.value))}
              className="w-full accent-[#facc15] bg-[#0a0a0a] rounded-lg cursor-pointer h-1.5"
            />
            <div className="flex justify-between text-[10px] text-[#8f8f86] font-mono">
              <span>+1.0 dB (Weak disturbance)</span>
              <span>Default: +2.5 dB</span>
              <span>+6.0 dB (Dense masonry only)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Performance Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg bg-[#0a0a0a] border border-[#2e2e2e] flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] text-[#b5b5ad]">
            <span>Precision</span>
            <span className="text-[10px] font-mono text-[#8f8f86]">TP/(TP+FP)</span>
          </div>
          <span className="text-xl font-bold font-mono text-[#facc15]">
            {formatPct(metrics.precision)}
          </span>
          <span className="text-[10px] text-[#8f8f86]">
            {metrics.truePositives} TP • {metrics.falsePositives} FP
          </span>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0a0a0a] border border-[#2e2e2e] flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] text-[#b5b5ad]">
            <span>Recall</span>
            <span className="text-[10px] font-mono text-[#8f8f86]">TP/(TP+FN)</span>
          </div>
          <span className="text-xl font-bold font-mono text-[#facc15]">
            {formatPct(metrics.recall)}
          </span>
          <span className="text-[10px] text-[#8f8f86]">
            {metrics.truePositives} TP • {metrics.falseNegatives} Missed
          </span>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0a0a0a] border border-[#2e2e2e] flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] text-[#b5b5ad]">
            <span>F1 Score</span>
            <span className="text-[10px] font-mono text-[#8f8f86]">Harmonic Mean</span>
          </div>
          <span className="text-xl font-bold font-mono text-[#f5f5f0]">
            {metrics.f1Score.toFixed(3)}
          </span>
          <span className="text-[10px] text-[#8f8f86]">
            Balanced multi-class accuracy
          </span>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0a0a0a] border border-[#2e2e2e] flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] text-[#b5b5ad]">
            <span>Mean Spatial IoU</span>
            <span className="text-[10px] font-mono text-[#8f8f86]">Overlap Area</span>
          </div>
          <span className="text-xl font-bold font-mono text-cyan-400">
            {metrics.meanIoU.toFixed(2)} IoU
          </span>
          <span className="text-[10px] text-[#8f8f86]">
            Vector boundary localization
          </span>
        </div>
      </div>

      {/* 5x5 Multi-Class Confusion Matrix */}
      <div className="flex flex-col gap-2 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[#f5f5f0] uppercase tracking-wider">
            5×5 Multi-Class Confusion Matrix (Actual vs Predicted)
          </h4>
          <span className="text-[11px] text-[#8f8f86] font-mono">
            {metrics.totalEvaluated} Ground Truth Samples Evaluated
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#2e2e2e] bg-[#0a0a0a]">
          <table className="w-full text-xs font-mono text-left border-collapse">
            <thead>
              <tr className="bg-[#1a1a1a] border-b border-[#2e2e2e] text-[#8f8f86]">
                <th className="p-2.5 font-semibold text-[#f5f5f0] border-r border-[#2e2e2e]">
                  Actual \ Predicted
                </th>
                {THREAT_CLASSES.map((c) => (
                  <th key={c} className="p-2 text-center text-[11px] border-r border-[#2e2e2e] last:border-r-0">
                    {c === 'Unauthorized Construction'
                      ? 'Construction'
                      : c === 'Land Encroachment'
                      ? 'Encroachment'
                      : c}
                  </th>
                ))}
                <th className="p-2 text-center text-[11px] bg-[#121212] text-[#b5b5ad]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {THREAT_CLASSES.map((actualClass, rowIdx) => {
                const totalActual = cm.actualTotals[actualClass];
                return (
                  <tr
                    key={actualClass}
                    className="border-b border-[#2e2e2e]/60 hover:bg-[#1a1a1a]/40 transition-colors"
                  >
                    <td className="p-2.5 font-medium text-[#f5f5f0] border-r border-[#2e2e2e] bg-[#1a1a1a]/20">
                      {actualClass}
                    </td>
                    {THREAT_CLASSES.map((predClass, colIdx) => {
                      const count = cm.matrix[rowIdx][colIdx];
                      const isDiagonal = rowIdx === colIdx;

                      return (
                        <td
                          key={predClass}
                          className={`p-2 text-center border-r border-[#2e2e2e] last:border-r-0 ${
                            isDiagonal && count > 0
                              ? 'bg-[#facc15]/20 text-[#facc15] font-bold'
                              : count > 0
                              ? 'bg-amber-950/30 text-amber-400 font-semibold'
                              : 'text-[#8f8f86]'
                          }`}
                        >
                          {count}
                        </td>
                      );
                    })}
                    <td className="p-2 text-center font-bold text-[#f5f5f0] bg-[#121212]">
                      {totalActual}
                    </td>
                  </tr>
                );
              })}
              {/* Predicted Totals Row */}
              <tr className="bg-[#1a1a1a] font-bold text-[#b5b5ad]">
                <td className="p-2.5 border-r border-[#2e2e2e]">Total Predicted</td>
                {THREAT_CLASSES.map((c) => (
                  <td key={c} className="p-2 text-center border-r border-[#2e2e2e] last:border-r-0 text-[#f5f5f0]">
                    {cm.predictedTotals[c]}
                  </td>
                ))}
                <td className="p-2 text-center text-[#facc15] bg-[#121212]">
                  {metrics.truePositives + metrics.falsePositives}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Honest Scientific Limitations Callout */}
      <div className="p-3 rounded-lg bg-[#1a1a1a] border border-[#2e2e2e] text-xs text-[#b5b5ad] leading-relaxed flex items-start gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-[#facc15] shrink-0 mt-0.5" />
        <div>
          <span className="text-[#f5f5f0] font-semibold">Evidentiary Confidence & Threshold Tuning:</span>{' '}
          Setting ΔNDVI to <code className="text-[#facc15]">{ndviThreshold.toFixed(2)}</code> and ΔSAR to{' '}
          <code className="text-[#facc15]">+{sarThreshold.toFixed(1)} dB</code> yields{' '}
          <span className="text-[#f5f5f0] font-semibold">{formatPct(metrics.precision)} Precision</span> and{' '}
          <span className="text-[#f5f5f0] font-semibold">{formatPct(metrics.recall)} Recall</span>. The dual-sensor
          fusion filter suppresses seasonal crop harvesting false alarms while flagging structural masonry double-bounces
          under Section 63 BSA criteria.
        </div>
      </div>
    </div>
  );
}
