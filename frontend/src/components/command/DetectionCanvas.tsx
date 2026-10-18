import React from 'react';
import { SceneRenderer } from '../canvas/SceneRenderer';
import { Spinner } from '../ui/Spinner';
import { DetectionResult } from '../../hooks/useDetectionWorker';
import { DetectionBlob } from '../../types/scan.types';
import { getClassColor } from '../../utils/riskColors';

interface DetectionCanvasProps {
  result: DetectionResult | null;
  isRunning: boolean;
  progress: number;
}

export function DetectionCanvas({ result, isRunning, progress }: DetectionCanvasProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Progress Bar */}
      {isRunning && (
        <div className="w-full bg-panel-light border border-border rounded-full h-2 overflow-hidden">
          <div
            className="bg-accent h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* T0 and T1 Scene Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* T0 Baseline */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#f1f5f3]">
              Simulated scene (T0 baseline)
            </span>
            <span className="text-[10px] text-[#b4c2bb] font-mono px-1.5 py-0.5 rounded bg-[#111816] border border-[#2a3832]">
              Simulated scene · Sentinel-2 MSI
            </span>
          </div>

          <div className="relative aspect-square rounded-lg overflow-hidden border border-[#2a3832] bg-[#16201c] flex items-center justify-center">
            {result?.t0_scene ? (
              <SceneRenderer data={result.t0_scene} className="w-full h-full" />
            ) : isRunning ? (
              <div className="flex flex-col items-center gap-2">
                <Spinner color="neon" size="md" />
                <span className="text-xs text-[#b4c2bb]">Synthesizing scene...</span>
              </div>
            ) : (
              <div className="text-xs text-[#b4c2bb] text-center px-4">
                Select a zone and click "Run scan"
              </div>
            )}
          </div>
        </div>

        {/* T1 Validated Scene with Overlay */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#f1f5f3]">
              Simulated scene & validated detections (T1)
            </span>
            <span className="text-[10px] text-[#22c55e] font-mono px-1.5 py-0.5 rounded bg-[#111816] border border-[#2a3832]">
              Simulated scene · Sentinel-1/2
            </span>
          </div>

          <div className="relative aspect-square rounded-lg overflow-hidden border border-border bg-panel-light flex items-center justify-center">
            {result?.t1_scene ? (
              <div className="relative w-full h-full">
                <SceneRenderer
                  data={result.t1_scene}
                  changeMask={result.change_mask}
                  className="w-full h-full"
                />

                {/* SVG Overlay for Validated Detections with Class Colors */}
                {result.blobs && (
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
                        // Stippled gray outline for filtered false-positive
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
                            fill="#111816"
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
