import React, { useState, useMemo } from 'react';
import { SceneRenderer } from '../canvas/SceneRenderer';
import { Spinner } from '../ui/Spinner';
import { DetectionResult } from '../../hooks/useDetectionWorker';
import { DetectionBlob } from '../../types/scan.types';
import { getClassColor } from '../../utils/riskColors';
import { Layers } from 'lucide-react';

interface DetectionCanvasProps {
  result: DetectionResult | null;
  sceneType?: 'optical' | 'sar' | 'fused';
  isRunning: boolean;
  progress: number;
  currentStage?: string;
}

type LayerMode = 'composite' | 'ndvi' | 'sar' | 'mask';

export function DetectionCanvas({ result, isRunning, progress, currentStage, sceneType = 'fused' }: DetectionCanvasProps) {
  // Labels come from the scan itself: real scene dates when real imagery was used,
  // and the sensor that actually ran (real sites without SAR run optical-only).
  const meta = result?.scene_metadata;
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    const day = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
    return `${day}, ${time} UTC`;
  };
  const t0DateLabel = meta?.t0Date ? fmtDate(meta.t0Date) : 'Calibration scene (synthetic)';
  const t1DateLabel = meta?.t1Date ? fmtDate(meta.t1Date) : 'Calibration scene (synthetic)';
  const effectiveSensor = meta?.isRealData && meta.sarAvailable === false ? 'optical' : sceneType;
  const sensorLabel =
    effectiveSensor === 'optical'
      ? 'Sentinel-2 MSI (10m)'
      : effectiveSensor === 'sar'
      ? 'Sentinel-1 SAR (C-band)'
      : 'Sentinel-2 MSI + Sentinel-1 SAR';

  const [activeLayer, setActiveLayer] = useState<LayerMode>('composite');

  // Compute alternative raster representations for heatmaps
  const t1LayerScene = useMemo(() => {
    if (!result) return null;
    const size = 256;
    const total = size * size;

    if (activeLayer === 'ndvi' && result.dNDVI) {
      const rgb = new Float32Array(total * 3);
      for (let i = 0; i < total; i++) {
        const d = result.dNDVI[i];
        if (d < 0) {
          // Vegetation loss -> Red gradient
          const intensity = Math.min(1.0, Math.abs(d) * 2.5);
          rgb[i * 3 + 0] = intensity;
          rgb[i * 3 + 1] = 0.08;
          rgb[i * 3 + 2] = 0.08;
        } else {
          // Healthy vegetation -> Green gradient
          const intensity = Math.min(1.0, d * 2.0);
          rgb[i * 3 + 0] = 0.05;
          rgb[i * 3 + 1] = 0.15 + intensity * 0.7;
          rgb[i * 3 + 2] = 0.08;
        }
      }
      return rgb;
    }

    if (activeLayer === 'sar' && result.dSAR) {
      const rgb = new Float32Array(total * 3);
      for (let i = 0; i < total; i++) {
        const d = result.dSAR[i];
        if (d > 0) {
          // Double-bounce reflection increase -> Amber/Yellow
          const intensity = Math.min(1.0, d / 6.0);
          rgb[i * 3 + 0] = intensity;
          rgb[i * 3 + 1] = intensity * 0.85;
          rgb[i * 3 + 2] = 0.1;
        } else {
          // Roughness decrease / smoothing -> Cyan/Blue
          const intensity = Math.min(1.0, Math.abs(d) / 6.0);
          rgb[i * 3 + 0] = 0.05;
          rgb[i * 3 + 1] = intensity * 0.6;
          rgb[i * 3 + 2] = intensity;
        }
      }
      return rgb;
    }

    if (activeLayer === 'mask' && result.change_mask) {
      const rgb = new Float32Array(total * 3);
      for (let i = 0; i < total; i++) {
        const flag = result.change_mask[i] > 0;
        rgb[i * 3 + 0] = flag ? 0.95 : 0.05;
        rgb[i * 3 + 1] = flag ? 0.25 : 0.07;
        rgb[i * 3 + 2] = flag ? 0.25 : 0.07;
      }
      return rgb;
    }

    // Default: Composite RGB scene
    return result.t1_scene;
  }, [result, activeLayer]);

  return (
    <div className="flex flex-col gap-4">
      {/* Stage-by-Stage Progress Bar & Indicator */}
      {isRunning && (
        <div className="p-3 rounded-lg bg-[#172031] border border-[#facc15]/40 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#e6eaf0] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#facc15] animate-ping" />
              {currentStage || 'Running multi-temporal pipeline...'}
            </span>
            <span className="font-mono text-[#facc15] font-semibold">{progress}%</span>
          </div>
          <div className="w-full bg-[#111826] border border-[#222c3d] rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#facc15] h-full rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Layer Toggle Buttons (when result is available) */}
      {result && (
        <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-[#0b1018] border border-[#222c3d]">
          <div className="flex items-center gap-1 text-xs text-[#98a2b3]">
            <Layers className="w-3.5 h-3.5 text-[#facc15]" />
            <span className="font-medium text-[11px] hidden sm:inline">Layer view:</span>
          </div>
          <div className="flex items-center gap-1">
            {(
              [
                { id: 'composite', label: 'Composite (Fused)' },
                { id: 'ndvi', label: 'NDVI Diff Heatmap' },
                { id: 'sar', label: 'SAR Radar Diff' },
                { id: 'mask', label: 'Change Mask' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveLayer(tab.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  activeLayer === tab.id
                    ? 'bg-[#172031] text-[#facc15] border border-[#facc15]/40'
                    : 'text-[#98a2b3] hover:text-[#e6eaf0] border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* T0 and T1 Scene Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* T0 Baseline */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#e6eaf0]">
                Timeline T0 · Baseline Reference
              </span>
              <span className="text-[10px] font-mono text-[#facc15]">
                {t0DateLabel}
              </span>
            </div>
            <span className="text-[10px] text-[#98a2b3] font-mono px-2 py-0.5 rounded bg-[#111826] border border-[#222c3d]">
              {sensorLabel}
            </span>
          </div>

          <div className="relative aspect-square rounded-lg overflow-hidden border border-[#222c3d] bg-[#172031] flex items-center justify-center">
            {result?.t0_scene ? (
              <SceneRenderer data={result.t0_scene} className="w-full h-full" />
            ) : isRunning ? (
              <div className="flex flex-col items-center gap-2">
                <Spinner color="neon" size="md" />
                <span className="text-xs text-[#98a2b3]">Loading baseline scene...</span>
              </div>
            ) : (
              <div className="text-xs text-[#98a2b3] text-center px-4">
                Select a zone and click "Run scan"
              </div>
            )}
          </div>
        </div>

        {/* T1 Validated Scene with Overlay */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#e6eaf0]">
                {activeLayer === 'composite'
                  ? 'Timeline T1 · Detection Pass'
                  : activeLayer === 'ndvi'
                  ? 'NDVI Vegetation Delta (T1 − T0)'
                  : activeLayer === 'sar'
                  ? 'SAR Double-Bounce dB (T1 − T0)'
                  : 'Binary Classified Change Mask'}
              </span>
              <span className="text-[10px] font-mono text-[#ef4444] font-bold">
                {t1DateLabel}
              </span>
            </div>
            <span className="text-[10px] text-[#facc15] font-mono px-2 py-0.5 rounded bg-[#111826] border border-[#222c3d]">
              {sensorLabel}
            </span>
          </div>

          <div className="relative aspect-square rounded-lg overflow-hidden border border-border bg-[#172031] flex items-center justify-center">
            {t1LayerScene ? (
              <div className="relative w-full h-full">
                <SceneRenderer
                  data={t1LayerScene}
                  changeMask={activeLayer === 'composite' ? result?.change_mask : null}
                  className="w-full h-full"
                />

                {/* SVG Overlay for Validated Detections with Class Colors (shown on composite & mask) */}
                {(activeLayer === 'composite' || activeLayer === 'mask') && result?.blobs && (
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox="0 0 256 256"
                  >
                    {result.blobs.map((blob: DetectionBlob) => {
                      const [minX, minY, maxX, maxY] = blob.bbox;
                      const width = maxX - minX;
                      const height = maxY - minY;
                      const color = getClassColor(blob.class);

                      if (!blob.isValidated) {
                        return (
                          <g key={blob.id}>
                            <rect
                              x={minX}
                              y={minY}
                              width={width}
                              height={height}
                              fill="none"
                              stroke="#64748b"
                              strokeWidth="1.5"
                              strokeDasharray="3 3"
                            />
                            <text
                              x={minX}
                              y={Math.max(10, minY - 3)}
                              fill="#64748b"
                              fontSize="8"
                              fontFamily="Inter, sans-serif"
                            >
                              Filtered ({blob.rejectReason?.split(' ')[0]})
                            </text>
                          </g>
                        );
                      }

                      return (
                        <g key={blob.id}>
                          <rect
                            x={minX}
                            y={minY}
                            width={width}
                            height={height}
                            fill={`${color}22`}
                            stroke={color}
                            strokeWidth="1.5"
                          />
                          <rect
                            x={minX}
                            y={Math.max(0, minY - 12)}
                            width={Math.min(120, blob.class.length * 6 + 10)}
                            height="12"
                            fill="#111826"
                            stroke={color}
                            strokeWidth="0.5"
                          />
                          <text
                            x={minX + 3}
                            y={Math.max(9, minY - 3)}
                            fill={color}
                            fontSize="8"
                            fontWeight="600"
                            fontFamily="Inter, sans-serif"
                          >
                            {blob.class}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>
            ) : isRunning ? (
              <div className="flex flex-col items-center gap-2">
                <Spinner color="cyan" size="md" />
                <span className="text-xs text-muted">{progress}% analyzing bands...</span>
              </div>
            ) : (
              <div className="text-xs text-muted text-center px-4">
                Validated overlay will render here
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
