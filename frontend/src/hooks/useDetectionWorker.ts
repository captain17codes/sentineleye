import { useState, useRef, useEffect, useCallback } from 'react';
import { WorkerInput, WorkerOutput, SceneType, DetectionBlob, DataSourceMode, RealSceneMetadata } from '../types/scan.types';

export interface DetectionResult {
  t0_scene: Float32Array;
  t1_scene: Float32Array;
  t0_optical?: Float32Array;
  t0_sar?: Float32Array;
  t1_optical?: Float32Array;
  t1_sar?: Float32Array;
  change_mask: Float32Array;
  dNDVI?: Float32Array;
  dSAR?: Float32Array;
  cloudMask?: Uint8Array;
  raw_count: number;
  validated_count: number;
  false_positives_filtered: number;
  belowThresholdCount?: number;
  blobs: DetectionBlob[];
  raw_classes: DetectionBlob[];
  validated_classes: DetectionBlob[];
  change_score: number;
  data_source?: DataSourceMode;
  scene_metadata?: RealSceneMetadata;
  // Legacy aliases
  raw_scene: Float32Array;
  validated_scene: Float32Array;
}

export function useDetectionWorker() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/detection.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerOutput>) => {
      const { type, payload } = event.data;
      if (type === 'PROGRESS') {
        setProgress(payload.progress || 0);
        if (payload.currentStage) {
          setCurrentStage(payload.currentStage);
        }
      } else if (type === 'RESULT') {
        const t0 = payload.t0_scene || new Float32Array(256 * 256 * 3);
        const t1 = payload.t1_scene || new Float32Array(256 * 256 * 3);
        const mask = payload.change_mask || new Float32Array(256 * 256);
        const blobs = payload.blobs || [];

        setResult({
          t0_scene: t0,
          t1_scene: t1,
          t0_optical: payload.t0_optical,
          t0_sar: payload.t0_sar,
          t1_optical: payload.t1_optical,
          t1_sar: payload.t1_sar,
          change_mask: mask,
          dNDVI: payload.dNDVI,
          dSAR: payload.dSAR,
          cloudMask: payload.cloudMask,
          raw_count: payload.raw_count ?? blobs.length,
          validated_count: payload.validated_count ?? blobs.filter((b) => b.isValidated).length,
          false_positives_filtered: payload.false_positives_filtered ?? 0,
          belowThresholdCount: payload.belowThresholdCount ?? 0,
          blobs,
          raw_classes: payload.raw_classes || blobs,
          validated_classes: payload.validated_classes || blobs.filter((b) => b.isValidated),
          change_score: payload.change_score || 0,
          data_source: payload.data_source,
          scene_metadata: payload.scene_metadata,
          raw_scene: t0,
          validated_scene: t1,
        });
        setIsRunning(false);
        setProgress(100);
        setCurrentStage('Scan completed');
      } else if (type === 'ERROR') {
        setError(payload.error || 'Worker error');
        setIsRunning(false);
      }
    };

    worker.onerror = (err) => {
      console.error('Worker error:', err);
      setError('Detection worker execution failed');
      setIsRunning(false);
    };

    return () => {
      worker.terminate();
    };
  }, []);

  const runDetection = useCallback(
    (params: {
      zone_id: number;
      scene_type: SceneType;
      cloud_coverage: number;
      lat: number;
      lng: number;
      data_source?: DataSourceMode;
    }) => {
      if (!workerRef.current) return;
      setIsRunning(true);
      setProgress(5);
      setError(null);
      setResult(null);

      const msg: WorkerInput = {
        type: 'RUN',
        payload: params,
      };
      workerRef.current.postMessage(msg);
    },
    []
  );

  return {
    runDetection,
    isRunning,
    progress,
    currentStage,
    result,
    error,
  };
}
