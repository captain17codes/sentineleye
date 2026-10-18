import React from 'react';
import { DetectionBlob, EncroachmentClass } from '../../types/scan.types';
import { getClassColor } from '../../utils/riskColors';
import { ShieldCheck, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';

interface ClassifierOutputProps {
  blobs: DetectionBlob[];
  rawCount: number;
  validatedCount: number;
  falsePositivesFiltered: number;
}

const ENUM_CLASSES: EncroachmentClass[] = [
  'Deforestation',
  'Unauthorized Construction',
  'Mining',
  'Land Encroachment',
];

export function ClassifierOutput({
  blobs,
  rawCount,
  validatedCount,
  falsePositivesFiltered,
}: ClassifierOutputProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Counts Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <h4 className="text-xs font-semibold text-text">Detections breakdown</h4>
          <p className="text-[11px] text-muted">
            {validatedCount} validated encroachment{validatedCount !== 1 ? 's' : ''} inside protected polygon
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-panel-light border border-border text-muted">
            Raw: {rawCount}
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-accent/15 border border-accent/40 text-accent font-semibold">
            Validated: {validatedCount}
          </span>
          {falsePositivesFiltered > 0 && (
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-panel-light border border-border text-muted">
              Filtered: {falsePositivesFiltered}
            </span>
          )}
        </div>
      </div>

      {/* Class distribution chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ENUM_CLASSES.map((cls) => {
          const color = getClassColor(cls);
          const count = blobs.filter((b) => b.class === cls && b.isValidated).length;
          return (
            <div
              key={cls}
              className="p-2.5 rounded-lg bg-panel-light border border-border flex flex-col gap-1"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[11px] font-medium text-muted truncate">{cls}</span>
              </div>
              <span className="text-base font-semibold text-text font-mono pl-3.5">
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Blobs Detail List */}
      <div className="flex flex-col gap-2 mt-1">
        <span className="text-xs font-medium text-text">Identified anomaly vectors</span>
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          {blobs.map((blob) => {
            const color = getClassColor(blob.class);
            return (
              <div
                key={blob.id}
                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                  blob.isValidated
                    ? 'bg-panel-light border-border'
                    : 'bg-panel-light/50 border-border/60 opacity-60'
                }`}
              >
                {/* Before / After Thumbnail Preview */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex flex-col items-center">
                    <img
                      src={blob.beforeCrop}
                      alt="T0 crop"
                      className="w-9 h-9 rounded object-cover border border-border bg-bg"
                    />
                    <span className="text-[8px] font-mono text-muted mt-0.5">T0</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <img
                      src={blob.afterCrop}
                      alt="T1 crop"
                      className="w-9 h-9 rounded object-cover border border-border bg-bg"
                    />
                    <span className="text-[8px] font-mono text-muted mt-0.5">T1</span>
                  </div>
                </div>

                {/* Vector Details */}
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-medium text-text truncate">{blob.class}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted font-mono">
                    <span>{blob.area_m2.toLocaleString()} m²</span>
                    <span>•</span>
                    <span>{blob.overlap_pct}% zone overlap</span>
                    <span>•</span>
                    <span>{(blob.confidence * 100).toFixed(0)}% conf</span>
                  </div>
                  {!blob.isValidated && blob.rejectReason && (
                    <span className="text-[10px] text-muted italic">
                      Rejected: {blob.rejectReason}
                    </span>
                  )}
                </div>

                {/* Validation Status Indicator */}
                <div className="flex-shrink-0">
                  {blob.isValidated ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-accent/15 text-accent border border-accent/30">
                      <CheckCircle className="w-3 h-3" />
                      Validated
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-panel text-muted border border-border">
                      <XCircle className="w-3 h-3 text-muted" />
                      Suppressed
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
