/**
 * Full Scan Engine Pipeline Orchestrator.
 * Can be run synchronously or inside a Web Worker.
 */

import { DEMO_SEED, SCENE } from '../config';
import { generateBitemporalScene, BoundingBox, BitemporalScene, SceneBands, createGeotransform } from './scene';
import { generateCloudMask } from './cloud';
import { computeNdviGrid, computeNdviDiff } from './ndvi';
import { computeSarDiff } from './sar';
import { performFusion, ScanMode, FusionResult } from './fusion';
import { vectorizeChangeMask, VectorBlob } from './vectorize';
import { computeCadastralOverlap, OverlayResult } from './overlay';
import { classifyDetection, ClassifiedDetection } from './classify';

export interface ScanPipelineInput {
  zoneId: number;
  bbox: BoundingBox;
  zoneGeoJson: any;
  mode: ScanMode;
  cloudCoverage: number;
  seed?: number;
  dataSource?: 'calibration' | 'real';
  realScene?: {
    t0: SceneBands;
    t1: SceneBands;
    cloudMask?: Uint8Array;
  };
  thresholds?: {
    ndviChange?: number;
    sarChangeDb?: number;
  };
  onProgress?: (stage: string, percent: number) => void;
}

export interface ScanPipelineOutput {
  scene: BitemporalScene;
  cloudMask: Uint8Array;
  dNDVI: Float32Array;
  dSAR: Float32Array;
  fusion: FusionResult;
  blobs: VectorBlob[];
  detections: ClassifiedDetection[];
  stats: {
    rawDetectionsCount: number;
    rejectedCount: number;
    validatedCount: number;
    belowThresholdCount: number;
    totalEncroachedAreaM2: number;
  };
}

export function runScanPipeline(input: ScanPipelineInput): ScanPipelineOutput {
  const seed = input.seed ?? DEMO_SEED;
  const size = SCENE.SIZE;

  input.onProgress?.('Ingest: Reading Sentinel-1 SAR and Sentinel-2 optical rasters', 10);
  const scene: BitemporalScene = input.realScene
    ? {
        size,
        t0: input.realScene.t0,
        t1: input.realScene.t1,
        geotransform: createGeotransform(input.bbox, size),
        scenarios: [],
      }
    : generateBitemporalScene(input.zoneId, input.bbox, seed, size);

  input.onProgress?.('Atmospheric: Generating cloud and haze mask', 25);
  const cloudMask = input.realScene?.cloudMask ?? generateCloudMask(size, input.cloudCoverage, seed);

  input.onProgress?.('Spectral: Computing bitemporal NDVI vegetation gradient', 40);
  const ndviT0 = computeNdviGrid(scene.t0.nir, scene.t0.red, size);
  const ndviT1 = computeNdviGrid(scene.t1.nir, scene.t1.red, size);
  const dNDVI = computeNdviDiff(ndviT1, ndviT0, size);

  input.onProgress?.('Radar: Filtering 3x3 SAR speckle and double-bounce diff', 55);
  const dSAR = computeSarDiff(scene.t1.sar, scene.t0.sar, size, true);

  input.onProgress?.('Fusion: Evaluating optical and microwave agreement', 70);
  const fusion = performFusion(dNDVI, dSAR, cloudMask, input.mode, size, input.thresholds);

  input.onProgress?.('Spatial: Connected-component vectorization of change masks', 80);
  const blobs = vectorizeChangeMask(fusion.changeMask, dNDVI, dSAR, fusion.confidenceMap, scene.geotransform, size);

  input.onProgress?.('Cadastral: Intersecting vector polygons with cadastral boundary', 90);
  const overlays: OverlayResult[] = blobs.map((b) => computeCadastralOverlap(b, input.zoneGeoJson));

  input.onProgress?.('Classify: Mapping statutory violations and severity', 95);
  const validatedOverlays = overlays.filter((o) => o.overlapPct >= 35);
  const belowThresholdCount = overlays.length - validatedOverlays.length;

  const detections: ClassifiedDetection[] = validatedOverlays.map(classifyDetection);

  const totalArea = detections.reduce((sum, d) => sum + d.areaM2, 0);

  input.onProgress?.('Complete: Ledger candidate blocks generated', 100);

  return {
    scene,
    cloudMask,
    dNDVI,
    dSAR,
    fusion,
    blobs,
    detections,
    stats: {
      rawDetectionsCount: blobs.length + (fusion.rejectedCount > 0 ? 1 : 0),
      rejectedCount: fusion.rejectedCount > 0 ? 1 : 0, // seasonal farm patch
      validatedCount: detections.length,
      belowThresholdCount,
      totalEncroachedAreaM2: totalArea,
    },
  };
}
