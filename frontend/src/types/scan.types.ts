export type SceneType = 'optical' | 'sar' | 'fused';
export type DataSourceMode = 'calibration' | 'real';

export interface RealSceneMetadata {
  t0SceneId: string;
  t1SceneId: string;
  t0Date: string;
  t1Date: string;
  sarT0SceneId?: string;
  sarT1SceneId?: string;
  telemetrySource?: string;
  isControl?: boolean;
}

export type EncroachmentClass =
  | 'Deforestation'
  | 'Unauthorized Construction'
  | 'Mining'
  | 'Land Encroachment';

export interface DetectionBlob {
  id: number;
  class: EncroachmentClass;
  confidence: number;
  area_m2: number;
  overlap_pct: number;
  bbox: [number, number, number, number]; // [minX, minY, maxX, maxY]
  isValidated: boolean;
  rejectReason?: string;
  beforeCrop: string; // base64 data URL
  afterCrop: string;  // base64 data URL
  patch?: number;
}

export type ClassResult = DetectionBlob;

export interface ScanResult {
  zone_id: number;
  scene_type: SceneType;
  cloud_coverage: number;
  raw_count: number;
  validated_count: number;
  change_score: number;
  blobs: DetectionBlob[];
  raw_classes?: DetectionBlob[];
  validated_classes?: DetectionBlob[];
  before_img?: string;
  after_img?: string;
  lat?: number;
  lng?: number;
  data_source?: DataSourceMode;
  scene_metadata?: RealSceneMetadata;
}

export interface WorkerInput {
  type: 'RUN';
  payload: {
    zone_id: number;
    scene_type: SceneType;
    cloud_coverage: number;
    lat: number;
    lng: number;
    zoneCoordinates?: number[][];
    data_source?: DataSourceMode;
  };
}

export interface WorkerOutput {
  type: 'RESULT' | 'PROGRESS' | 'ERROR';
  payload: {
    t0_scene?: Float32Array;
    t1_scene?: Float32Array;
    t0_optical?: Float32Array;
    t0_sar?: Float32Array;
    t1_optical?: Float32Array;
    t1_sar?: Float32Array;
    change_mask?: Float32Array;
    raw_count?: number;
    validated_count?: number;
    false_positives_filtered?: number;
    blobs?: DetectionBlob[];
    raw_classes?: DetectionBlob[];
    validated_classes?: DetectionBlob[];
    change_score?: number;
    progress?: number;
    currentStage?: string;
    dNDVI?: Float32Array;
    dSAR?: Float32Array;
    cloudMask?: Uint8Array;
    belowThresholdCount?: number;
    data_source?: DataSourceMode;
    scene_metadata?: RealSceneMetadata;
    error?: string;
  };
}
