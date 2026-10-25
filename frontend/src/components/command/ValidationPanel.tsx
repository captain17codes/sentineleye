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
    <div className="p-5 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col gap-5 shadow-xl select-none">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2a3832]">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#22c55e]" />
          <div>
            <h3 className="text-sm font-semibold text-[#f1f5f3]">
              Empirical Validation & Model Sensitivity
            </h3>
            <p className="text-xs text-[#b4c2bb]">
              Ground-truth verification across 38 planted spatial scenarios & Element 84 real Sentinel telemetry
            </p>
          </div>
        </div>

        {/* Scope Toggle: Active Zone vs All 8 Zones */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#0b0f0e] border border-[#2a3832] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setScope('benchmark')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
              scope === 'benchmark'
                ? 'bg-[#16201c] text-[#22c55e] border border-[#22c55e]/40 font-semibold'
                : 'text-[#b4c2bb] hover:text-[#f1f5f3]'
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
                ? 'bg-[#16201c] text-[#22c55e] border border-[#22c55e]/40 font-semibold'
                : 'text-[#b4c2bb] hover:text-[#f1f5f3]'
            }`}
          >
            <Target className="w-3 h-3" />
            <span>Active Sector (Z-{zoneId || 102})</span>
          </button>
        </div>
      </div>

      {/* Threshold Sensitivity Sliders */}
      <div className="p-4 rounded-lg bg-[#16201c] border border-[#2a3832] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#f1f5f3] flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#22c55e]" />
            Dual-Sensor Decision Threshold Sensitivity
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="text-[11px] text-[#8fa097] hover:text-[#22c55e] flex items-center gap-1 transition-colors"
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
              <span className="text-[#b4c2bb] font-medium">Optical Vegetation Loss (ΔNDVI):</span>
              <span className="font-mono text-[#22c55e] font-semibold">
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
              className="w-full accent-[#22c55e] bg-[#0b0f0e] rounded-lg cursor-pointer h-1.5"
            />
            <div className="flex justify-between text-[10px] text-[#8fa097] font-mono">
              <span>-0.45 (Strict / Large clearing)</span>
              <span>Default: -0.25</span>
              <span>-0.15 (High sensitivity)</span>
            </div>
          </div>

          {/* SAR Slider */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#b4c2bb] font-medium">Radar Double-Bounce Diff (ΔSAR):</span>
              <span className="font-mono text-[#22c55e] font-semibold">
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
              className="w-full accent-[#22c55e] bg-[#0b0f0e] rounded-lg cursor-pointer h-1.5"
            />
            <div className="flex justify-between text-[10px] text-[#8fa097] font-mono">
              <span>+1.0 dB (Weak disturbance)</span>
              <span>Default: +2.5 dB</span>
              <span>+6.0 dB (Dense masonry only)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Performance Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg bg-[#0b0f0e] border border-[#2a3832] flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] text-[#b4c2bb]">
            <span>Precision</span>
            <span className="text-[10px] font-mono text-[#8fa097]">TP/(TP+FP)</span>
          </div>
          <span className="text-xl font-bold font-mono text-[#22c55e]">
            {formatPct(metrics.precision)}
          </span>
          <span className="text-[10px] text-[#8fa097]">
            {metrics.truePositives} TP • {metrics.falsePositives} FP
          </span>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0b0f0e] border border-[#2a3832] flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] text-[#b4c2bb]">
            <span>Recall</span>
            <span className="text-[10px] font-mono text-[#8fa097]">TP/(TP+FN)</span>
          </div>
          <span className="text-xl font-bold font-mono text-[#22c55e]">
            {formatPct(metrics.recall)}
          </span>
          <span className="text-[10px] text-[#8fa097]">
            {metrics.truePositives} TP • {metrics.falseNegatives} Missed
          </span>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0b0f0e] border border-[#2a3832] flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] text-[#b4c2bb]">
            <span>F1 Score</span>
            <span className="text-[10px] font-mono text-[#8fa097]">Harmonic Mean</span>
          </div>
          <span className="text-xl font-bold font-mono text-[#f1f5f3]">
            {metrics.f1Score.toFixed(3)}
          </span>
          <span className="text-[10px] text-[#8fa097]">
            Balanced multi-class accuracy
          </span>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0b0f0e] border border-[#2a3832] flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] text-[#b4c2bb]">
            <span>Mean Spatial IoU</span>
            <span className="text-[10px] font-mono text-[#8fa097]">Overlap Area</span>
          </div>
          <span className="text-xl font-bold font-mono text-cyan-400">
            {metrics.meanIoU.toFixed(2)} IoU
          </span>
          <span className="text-[10px] text-[#8fa097]">
            Vector boundary localization
          </span>
        </div>
      </div>

      {/* 5x5 Multi-Class Confusion Matrix */}
      <div className="flex flex-col gap-2 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[#f1f5f3] uppercase tracking-wider">
            5×5 Multi-Class Confusion Matrix (Actual vs Predicted)
          </h4>
          <span className="text-[11px] text-[#8fa097] font-mono">
            {metrics.totalEvaluated} Ground Truth Samples Evaluated
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#2a3832] bg-[#0b0f0e]">
          <table className="w-full text-xs font-mono text-left border-collapse">
            <thead>
              <tr className="bg-[#16201c] border-b border-[#2a3832] text-[#8fa097]">
                <th className="p-2.5 font-semibold text-[#f1f5f3] border-r border-[#2a3832]">
                  Actual \ Predicted
                </th>
                {THREAT_CLASSES.map((c) => (
                  <th key={c} className="p-2 text-center text-[11px] border-r border-[#2a3832] last:border-r-0">
                    {c === 'Unauthorized Construction'
                      ? 'Construction'
                      : c === 'Land Encroachment'
                      ? 'Encroachment'
                      : c}
                  </th>
                ))}
                <th className="p-2 text-center text-[11px] bg-[#111816] text-[#b4c2bb]">
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
                    className="border-b border-[#2a3832]/60 hover:bg-[#16201c]/40 transition-colors"
                  >
                    <td className="p-2.5 font-medium text-[#f1f5f3] border-r border-[#2a3832] bg-[#16201c]/20">
                      {actualClass}
                    </td>
                    {THREAT_CLASSES.map((predClass, colIdx) => {
                      const count = cm.matrix[rowIdx][colIdx];
                      const isDiagonal = rowIdx === colIdx;

                      return (
                        <td
                          key={predClass}
                          className={`p-2 text-center border-r border-[#2a3832] last:border-r-0 ${
                            isDiagonal && count > 0
                              ? 'bg-[#22c55e]/20 text-[#22c55e] font-bold'
                              : count > 0
                              ? 'bg-amber-950/30 text-amber-400 font-semibold'
                              : 'text-[#8fa097]'
                          }`}
                        >
                          {count}
                        </td>
                      );
                    })}
                    <td className="p-2 text-center font-bold text-[#f1f5f3] bg-[#111816]">
                      {totalActual}
                    </td>
                  </tr>
                );
              })}
              {/* Predicted Totals Row */}
              <tr className="bg-[#16201c] font-bold text-[#b4c2bb]">
                <td className="p-2.5 border-r border-[#2a3832]">Total Predicted</td>
                {THREAT_CLASSES.map((c) => (
                  <td key={c} className="p-2 text-center border-r border-[#2a3832] last:border-r-0 text-[#f1f5f3]">
                    {cm.predictedTotals[c]}
                  </td>
                ))}
                <td className="p-2 text-center text-[#22c55e] bg-[#111816]">
                  {metrics.truePositives + metrics.falsePositives}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Honest Scientific Limitations Callout */}
      <div className="p-3 rounded-lg bg-[#16201c] border border-[#2a3832] text-xs text-[#b4c2bb] leading-relaxed flex items-start gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
        <div>
          <span className="text-[#f1f5f3] font-semibold">Evidentiary Confidence & Threshold Tuning:</span>{' '}
          Setting ΔNDVI to <code className="text-[#22c55e]">{ndviThreshold.toFixed(2)}</code> and ΔSAR to{' '}
          <code className="text-[#22c55e]">+{sarThreshold.toFixed(1)} dB</code> yields{' '}
          <span className="text-[#f1f5f3] font-semibold">{formatPct(metrics.precision)} Precision</span> and{' '}
          <span className="text-[#f1f5f3] font-semibold">{formatPct(metrics.recall)} Recall</span>. The dual-sensor
          fusion filter suppresses seasonal crop harvesting false alarms while flagging structural masonry double-bounces
          under Section 63 BSA criteria.
        </div>
      </div>
    </div>
  );
}
