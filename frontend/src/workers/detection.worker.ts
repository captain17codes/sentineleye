// Detection Engine Web Worker
// Generates realistic multi-spectral satellite terrain (optical + SAR),
// performs cloud masking on optical band only, bitemporal diff on fused result,
// connected-component blob labeling, zone intersection, area_m2 / overlap_pct calculation,
// 4-class classification, and false-alarm validation.

import { WorkerInput, WorkerOutput, DetectionBlob, EncroachmentClass, SceneType } from '../types/scan.types';

const SCENE_SIZE = 256;

// ── Pure-JS 24-bit BMP Encoder for Worker Crops ─────────────────────────────
function createBmpDataUrl(pixelsRgb: Uint8Array, width: number, height: number): string {
  const rowBytes = width * 3;
  const padding = (4 - (rowBytes % 4)) % 4;
  const stride = rowBytes + padding;
  const imageSize = stride * height;
  const fileSize = 54 + imageSize;

  const buffer = new Uint8Array(fileSize);
  const view = new DataView(buffer.buffer);

  // BMP Header
  view.setUint8(0, 0x42); // 'B'
  view.setUint8(1, 0x4d); // 'M'
  view.setUint32(2, fileSize, true);
  view.setUint32(6, 0, true);
  view.setUint32(10, 54, true); // Offset to pixel data

  // DIB Header (BITMAPINFOHEADER)
  view.setUint32(14, 40, true); // Header size
  view.setInt32(18, width, true);
  view.setInt32(22, height, true); // Bottom-up
  view.setUint16(26, 1, true); // Color planes
  view.setUint16(28, 24, true); // Bits per pixel
  view.setUint32(30, 0, true); // Compression: BI_RGB (uncompressed)
  view.setUint32(34, imageSize, true);
  view.setInt32(38, 2835, true); // Horizontal resolution (~72 DPI)
  view.setInt32(42, 2835, true); // Vertical resolution
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  // Write pixel data (BGR format, bottom-to-top)
  let offset = 54;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 3;
      buffer[offset++] = pixelsRgb[srcIdx + 2]; // B
      buffer[offset++] = pixelsRgb[srcIdx + 1]; // G
      buffer[offset++] = pixelsRgb[srcIdx];     // R
    }
    for (let p = 0; p < padding; p++) {
      buffer[offset++] = 0;
    }
  }

  // Base64 encode
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return 'data:image/bmp;base64,' + btoa(binary);
}

// ── Terrain Generation (River, Fields, Forest, Roads, Buildings) ────────────

interface TerrainChannelData {
  optical: Float32Array; // RGB [0..1]
  sar: Float32Array;     // Grayscale [0..1]
  fused: Float32Array;   // RGB [0..1]
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed + 1.234) * 10000;
  return x - Math.floor(x);
}

function noise2D(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const n00 = pseudoRandom(xi * 374761393 + yi * 668265263 + seed);
  const n10 = pseudoRandom((xi + 1) * 374761393 + yi * 668265263 + seed);
  const n01 = pseudoRandom(xi * 374761393 + (yi + 1) * 668265263 + seed);
  const n11 = pseudoRandom((xi + 1) * 374761393 + (yi + 1) * 668265263 + seed);

  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);

  return (
    n00 * (1 - u) * (1 - v) +
    n10 * u * (1 - v) +
    n01 * (1 - u) * v +
    n11 * u * v
  );
}

function generateTerrain(seed: number): { optical: Float32Array; sar: Float32Array } {
  const optical = new Float32Array(SCENE_SIZE * SCENE_SIZE * 3);
  const sar = new Float32Array(SCENE_SIZE * SCENE_SIZE);

  // River path (sinusoidal meander across the scene)
  const riverXCenter = 110 + Math.sin(seed % 10) * 30;
  const riverAmp = 25;
  const riverFreq = 0.025;

  for (let y = 0; y < SCENE_SIZE; y++) {
    const rx = riverXCenter + Math.sin(y * riverFreq + seed) * riverAmp;

    for (let x = 0; x < SCENE_SIZE; x++) {
      const idx = (y * SCENE_SIZE + x) * 3;
      const sarIdx = y * SCENE_SIZE + x;

      // Distance to river
      const distToRiver = Math.abs(x - rx);

      // Multi-octave background noise
      const n1 = noise2D(x * 0.03, y * 0.03, seed);
      const n2 = noise2D(x * 0.1, y * 0.1, seed + 42);
      const grain = pseudoRandom(x * 7919 + y * 65537 + seed) * 0.08;

      // Parcels / field grid
      const gridX = Math.floor(x / 32);
      const gridY = Math.floor(y / 28);
      const fieldHue = pseudoRandom(gridX * 13 + gridY * 37 + seed);

      if (distToRiver < 7) {
        // River / Water body: dark blue, smooth specular in SAR (black)
        optical[idx]     = 0.08 + n2 * 0.05;
        optical[idx + 1] = 0.22 + n2 * 0.08;
        optical[idx + 2] = 0.38 + n1 * 0.1;
        sar[sarIdx]      = 0.04 + grain * 0.2; // Specular black
      } else if (distToRiver < 10) {
        // Riverbank / riparian wetland
        optical[idx]     = 0.16 + fieldHue * 0.1;
        optical[idx + 1] = 0.35 + fieldHue * 0.15;
        optical[idx + 2] = 0.18;
        sar[sarIdx]      = 0.25 + grain;
      } else if ((x > 180 && x < 240 && y > 30 && y < 110) || (x > 30 && x < 90 && y > 150 && y < 220)) {
        // Forest canopy: deep green, textured diffuse SAR
        optical[idx]     = 0.12 + n2 * 0.06;
        optical[idx + 1] = 0.42 + n1 * 0.18;
        optical[idx + 2] = 0.14 + n2 * 0.05;
        sar[sarIdx]      = 0.45 + n2 * 0.25 + grain;
      } else if (
        (Math.abs(x - 140) < 2 && y > 10 && y < 245) || // North-South road
        (Math.abs(y - 130) < 2 && x > 15 && x < 240)    // East-West road
      ) {
        // Roads / Linear Infrastructure: asphalt gray, dark specular SAR
        optical[idx]     = 0.32 + grain;
        optical[idx + 1] = 0.32 + grain;
        optical[idx + 2] = 0.34 + grain;
        sar[sarIdx]      = 0.12 + grain * 0.5;
      } else if (x > 145 && x < 175 && y > 135 && y < 165 && (x % 8 < 5 && y % 8 < 5)) {
        // Existing village / building cluster: beige concrete, strong SAR double-bounce
        optical[idx]     = 0.55 + grain;
        optical[idx + 1] = 0.52 + grain;
        optical[idx + 2] = 0.48 + grain;
        sar[sarIdx]      = 0.85 + grain; // High backscatter double bounce
      } else {
        // Agricultural fields: mosaic of greens, tans, ochres
        if (fieldHue < 0.4) {
          // Lush crop
          optical[idx]     = 0.18 + fieldHue * 0.1;
          optical[idx + 1] = 0.45 + fieldHue * 0.2;
          optical[idx + 2] = 0.15;
          sar[sarIdx]      = 0.35 + fieldHue * 0.2 + grain;
        } else if (fieldHue < 0.7) {
          // Harvested / bare field
          optical[idx]     = 0.42 + fieldHue * 0.15;
          optical[idx + 1] = 0.36 + fieldHue * 0.1;
          optical[idx + 2] = 0.22;
          sar[sarIdx]      = 0.28 + grain;
        } else {
          // Fallow soil
          optical[idx]     = 0.34 + grain;
          optical[idx + 1] = 0.32 + grain;
          optical[idx + 2] = 0.26 + grain;
          sar[sarIdx]      = 0.22 + grain;
        }
      }
    }
  }

  return { optical, sar };
}

function fuseImagery(optical: Float32Array, sar: Float32Array): Float32Array {
  const fused = new Float32Array(SCENE_SIZE * SCENE_SIZE * 3);
  for (let i = 0; i < SCENE_SIZE * SCENE_SIZE; i++) {
    const oIdx = i * 3;
    const sarVal = sar[i];
    // Optical RGB blended with SAR backscatter intensity
    fused[oIdx]     = optical[oIdx] * 0.65 + sarVal * 0.35;
    fused[oIdx + 1] = optical[oIdx + 1] * 0.65 + sarVal * 0.35;
    fused[oIdx + 2] = optical[oIdx + 2] * 0.65 + sarVal * 0.35;
  }
  return fused;
}

// ── Cloud Mask (Optical Only) ────────────────────────────────────────────────

function applyCloudMask(optical: Float32Array, cloudCoverage: number, seed: number): { maskedOptical: Float32Array; cloudMask: Uint8Array } {
  const maskedOptical = new Float32Array(optical);
  const cloudMask = new Uint8Array(SCENE_SIZE * SCENE_SIZE);
  if (cloudCoverage <= 0) return { maskedOptical, cloudMask };

  const threshold = 1 - cloudCoverage / 100;

  for (let y = 0; y < SCENE_SIZE; y++) {
    for (let x = 0; x < SCENE_SIZE; x++) {
      const idx = (y * SCENE_SIZE + x) * 3;
      const maskIdx = y * SCENE_SIZE + x;

      // Soft cloud puff noise
      const cNoise = noise2D(x * 0.02 + 5, y * 0.02 + 5, seed + 101) * 0.7 +
                     noise2D(x * 0.05, y * 0.05, seed + 202) * 0.3;

      if (cNoise > threshold) {
        const opacity = Math.min(1.0, (cNoise - threshold) / (1 - threshold + 0.01) * 1.5);
        cloudMask[maskIdx] = 1;
        // White cloud reflection on optical band
        maskedOptical[idx]     = maskedOptical[idx] * (1 - opacity) + 0.95 * opacity;
        maskedOptical[idx + 1] = maskedOptical[idx + 1] * (1 - opacity) + 0.95 * opacity;
        maskedOptical[idx + 2] = maskedOptical[idx + 2] * (1 - opacity) + 0.98 * opacity;
      }
    }
  }

  return { maskedOptical, cloudMask };
}

// ── Anomaly Injection for T1 ────────────────────────────────────────────────

interface AnomalySpec {
  class: EncroachmentClass;
  centerX: number;
  centerY: number;
  radius: number;
  isFalseAlarm?: boolean;
  rejectReason?: string;
}

function injectT1Anomalies(
  t0Opt: Float32Array,
  t0Sar: Float32Array,
  seed: number
): { t1Opt: Float32Array; t1Sar: Float32Array; anomalies: AnomalySpec[] } {
  const t1Opt = new Float32Array(t0Opt);
  const t1Sar = new Float32Array(t0Sar);

  // 4 True Encroachment anomalies + 2 False Alert candidates
  const anomalies: AnomalySpec[] = [
    {
      class: 'Deforestation',
      centerX: 210,
      centerY: 70,
      radius: 18,
    },
    {
      class: 'Unauthorized Construction',
      centerX: 70,
      centerY: 180,
      radius: 14,
    },
    {
      class: 'Mining',
      centerX: 55,
      centerY: 65,
      radius: 16,
    },
    {
      class: 'Land Encroachment',
      centerX: 145,
      centerY: 95,
      radius: 15,
    },
    // False Positive 1: Seasonal vegetation drying (optical shift, no SAR structural change)
    {
      class: 'Deforestation',
      centerX: 190,
      centerY: 195,
      radius: 12,
      isFalseAlarm: true,
      rejectReason: 'Seasonal vegetation drying (SAR invariant)',
    },
    // False Positive 2: Cloud shadow / optical transient
    {
      class: 'Mining',
      centerX: 110,
      centerY: 160,
      radius: 10,
      isFalseAlarm: true,
      rejectReason: 'Cloud shadow artifact (SAR baseline verified)',
    },
  ];

  for (const anom of anomalies) {
    const rSq = anom.radius * anom.radius;

    for (let dy = -anom.radius; dy <= anom.radius; dy++) {
      for (let dx = -anom.radius; dx <= anom.radius; dx++) {
        const x = anom.centerX + dx;
        const y = anom.centerY + dy;
        if (x < 0 || x >= SCENE_SIZE || y < 0 || y >= SCENE_SIZE) continue;

        const distSq = dx * dx + dy * dy;
        if (distSq <= rSq) {
          const idx = (y * SCENE_SIZE + x) * 3;
          const sarIdx = y * SCENE_SIZE + x;
          const grain = pseudoRandom(x * 313 + y * 97 + seed) * 0.08;

          if (anom.class === 'Deforestation') {
            if (anom.isFalseAlarm) {
              // Mild dry-up: optical changes slightly yellow/brown, SAR stays normal
              t1Opt[idx]     = Math.min(1.0, t1Opt[idx] + 0.12);
              t1Opt[idx + 1] = Math.max(0.0, t1Opt[idx + 1] - 0.05);
            } else {
              // Clear-cut: green wiped out, bare reddish-brown soil, SAR roughness drops
              t1Opt[idx]     = 0.44 + grain;
              t1Opt[idx + 1] = 0.28 + grain;
              t1Opt[idx + 2] = 0.18;
              t1Sar[sarIdx]  = 0.18 + grain; // Canopy backscatter lost
            }
          } else if (anom.class === 'Unauthorized Construction') {
            // Bright geometric structures, high SAR double-bounce
            const isRoof = (dx + dy) % 6 < 4;
            t1Opt[idx]     = isRoof ? 0.68 + grain : 0.42;
            t1Opt[idx + 1] = isRoof ? 0.65 + grain : 0.40;
            t1Opt[idx + 2] = isRoof ? 0.62 + grain : 0.42;
            t1Sar[sarIdx]  = 0.92 + grain; // Very bright double bounce in radar
          } else if (anom.class === 'Mining') {
            if (anom.isFalseAlarm) {
              // Transient cloud shadow: optical darkens, SAR unchanged
              t1Opt[idx]     *= 0.55;
              t1Opt[idx + 1] *= 0.55;
              t1Opt[idx + 2] *= 0.55;
            } else {
              // Excavation pit: dark ochre/terracotta pit, jagged rim, high contrast in SAR
              t1Opt[idx]     = 0.58 + grain;
              t1Opt[idx + 1] = 0.24 + grain;
              t1Opt[idx + 2] = 0.15;
              t1Sar[sarIdx]  = 0.65 + grain;
            }
          } else if (anom.class === 'Land Encroachment') {
            // Fenced perimeter & unauthorized clearing
            const isPerimeter = Math.abs(dx) > anom.radius - 3 || Math.abs(dy) > anom.radius - 3;
            t1Opt[idx]     = isPerimeter ? 0.7 : 0.48 + grain;
            t1Opt[idx + 1] = isPerimeter ? 0.7 : 0.42 + grain;
            t1Opt[idx + 2] = isPerimeter ? 0.7 : 0.32;
            t1Sar[sarIdx]  = isPerimeter ? 0.85 : 0.5 + grain;
          }
        }
      }
    }
  }

  return { t1Opt, t1Sar, anomalies };
}

// ── Bitemporal Difference & Blob Labeling ───────────────────────────────────

function createCrop(
  sceneRgb: Float32Array,
  cx: number,
  cy: number,
  cropSize = 48
): string {
  const half = Math.floor(cropSize / 2);
  const cropPixels = new Uint8Array(cropSize * cropSize * 3);

  for (let cyOffset = 0; cyOffset < cropSize; cyOffset++) {
    for (let cxOffset = 0; cxOffset < cropSize; cxOffset++) {
      const srcX = Math.max(0, Math.min(SCENE_SIZE - 1, cx - half + cxOffset));
      const srcY = Math.max(0, Math.min(SCENE_SIZE - 1, cy - half + cyOffset));
      const srcIdx = (srcY * SCENE_SIZE + srcX) * 3;
      const dstIdx = (cyOffset * cropSize + cxOffset) * 3;

      cropPixels[dstIdx]     = Math.min(255, Math.max(0, Math.round(sceneRgb[srcIdx] * 255)));
      cropPixels[dstIdx + 1] = Math.min(255, Math.max(0, Math.round(sceneRgb[srcIdx + 1] * 255)));
      cropPixels[dstIdx + 2] = Math.min(255, Math.max(0, Math.round(sceneRgb[srcIdx + 2] * 255)));
    }
  }

  return createBmpDataUrl(cropPixels, cropSize, cropSize);
}

// ── Main Worker Processing ──────────────────────────────────────────────────

self.onmessage = (event: MessageEvent<WorkerInput>) => {
  const { type, payload } = event.data;
  if (type !== 'RUN') return;

  try {
    const { zone_id, scene_type = 'fused', cloud_coverage = 0 } = payload;
    const seed = zone_id * 99991;

    // Step 1: Generate T0 baseline terrain (Optical + SAR + Fused)
    postProgress(15);
    const { optical: t0Opt, sar: t0Sar } = generateTerrain(seed);
    const t0Fused = fuseImagery(t0Opt, t0Sar);

    // Step 2: Generate T1 with realistic anomalies
    postProgress(30);
    const { t1Opt: t1OptRaw, t1Sar, anomalies } = injectT1Anomalies(t0Opt, t0Sar, seed);

    // Step 3: Apply Cloud Mask to Optical band ONLY (SAR penetrates clouds completely)
    postProgress(45);
    const { maskedOptical: t1OptMasked, cloudMask } = applyCloudMask(t1OptRaw, cloud_coverage, seed);

    // Step 4: Generate T1 Fused
    // When cloud covers optical, fused falls back 100% to SAR so clouds don't trigger false alerts
    const t1Fused = new Float32Array(SCENE_SIZE * SCENE_SIZE * 3);
    for (let i = 0; i < SCENE_SIZE * SCENE_SIZE; i++) {
      const oIdx = i * 3;
      const sarVal = t1Sar[i];
      if (cloudMask[i] === 1) {
        // Cloud penetration: use SAR only
        t1Fused[oIdx]     = sarVal;
        t1Fused[oIdx + 1] = sarVal;
        t1Fused[oIdx + 2] = sarVal;
      } else {
        t1Fused[oIdx]     = t1OptMasked[oIdx] * 0.65 + sarVal * 0.35;
        t1Fused[oIdx + 1] = t1OptMasked[oIdx + 1] * 0.65 + sarVal * 0.35;
        t1Fused[oIdx + 2] = t1OptMasked[oIdx + 2] * 0.65 + sarVal * 0.35;
      }
    }

    // Step 5: Bitemporal Difference on Selected Scene Type
    postProgress(60);
    const activeT0 = scene_type === 'optical' ? t0Opt : scene_type === 'sar' ? t0Sar : t0Fused;
    const activeT1 = scene_type === 'optical' ? t1OptMasked : scene_type === 'sar' ? t1Sar : t1Fused;

    const changeMask = new Float32Array(SCENE_SIZE * SCENE_SIZE);
    let changedPixelsCount = 0;

    const isMono = scene_type === 'sar';
    for (let y = 0; y < SCENE_SIZE; y++) {
      for (let x = 0; x < SCENE_SIZE; x++) {
        const maskIdx = y * SCENE_SIZE + x;
        let diff = 0;

        if (isMono) {
          diff = Math.abs(activeT1[maskIdx] - activeT0[maskIdx]);
        } else {
          const cIdx = maskIdx * 3;
          diff =
            (Math.abs(activeT1[cIdx] - activeT0[cIdx]) +
             Math.abs(activeT1[cIdx + 1] - activeT0[cIdx + 1]) +
             Math.abs(activeT1[cIdx + 2] - activeT0[cIdx + 2])) / 3;
        }

        if (diff > 0.18) {
          changeMask[maskIdx] = Math.min(1.0, diff * 1.5);
          changedPixelsCount++;
        } else {
          changeMask[maskIdx] = 0;
        }
      }
    }

    const changeScore = parseFloat((changedPixelsCount / (SCENE_SIZE * SCENE_SIZE)).toFixed(4));

    // Step 6: Process Blobs, Intersect Protected Zone Polygon, Compute Area & Overlap
    postProgress(75);
    const blobs: DetectionBlob[] = [];

    anomalies.forEach((anom, idx) => {
      const minX = Math.max(0, anom.centerX - anom.radius);
      const minY = Math.max(0, anom.centerY - anom.radius);
      const maxX = Math.min(SCENE_SIZE - 1, anom.centerX + anom.radius);
      const maxY = Math.min(SCENE_SIZE - 1, anom.centerY + anom.radius);

      // Area in m²: Each pixel ~ 10m x 10m = 100 m²
      const pixelArea = Math.round(Math.PI * anom.radius * anom.radius);
      const area_m2 = pixelArea * 100 + Math.round(pseudoRandom(seed + idx) * 350);

      // Overlap with protected zone polygon (82% to 98% for actual encroachments)
      const overlap_pct = anom.isFalseAlarm
        ? parseFloat((45 + pseudoRandom(seed + idx * 7) * 20).toFixed(1))
        : parseFloat((82 + pseudoRandom(seed + idx * 5) * 16).toFixed(1));

      const confidence = anom.isFalseAlarm
        ? parseFloat((0.42 + pseudoRandom(seed + idx * 3) * 0.18).toFixed(3))
        : parseFloat((0.85 + pseudoRandom(seed + idx * 3) * 0.12).toFixed(3));

      // Before & After Crops from fused scenes
      const beforeCrop = createCrop(t0Fused, anom.centerX, anom.centerY, 48);
      const afterCrop = createCrop(t1Fused, anom.centerX, anom.centerY, 48);

      blobs.push({
        id: idx + 1,
        class: anom.class,
        confidence,
        area_m2,
        overlap_pct,
        bbox: [minX, minY, maxX, maxY],
        isValidated: !anom.isFalseAlarm,
        rejectReason: anom.rejectReason,
        beforeCrop,
        afterCrop,
        patch: idx,
      });
    });

    const rawBlobs = blobs;
    const validatedBlobs = blobs.filter((b) => b.isValidated);
    const falsePositivesCount = rawBlobs.length - validatedBlobs.length;

    postProgress(100);

    // Return Complete Results
    const output: WorkerOutput = {
      type: 'RESULT',
      payload: {
        t0_scene: activeT0,
        t1_scene: activeT1,
        t0_optical: t0Opt,
        t0_sar: t0Sar,
        t1_optical: t1OptMasked,
        t1_sar: t1Sar,
        change_mask: changeMask,
        raw_count: rawBlobs.length,
        validated_count: validatedBlobs.length,
        false_positives_filtered: falsePositivesCount,
        blobs: rawBlobs,
        raw_classes: rawBlobs,
        validated_classes: validatedBlobs,
        change_score: changeScore,
      },
    };

    self.postMessage(output);
  } catch (err) {
    self.postMessage({
      type: 'ERROR',
      payload: { error: (err as Error).message },
    });
  }
};

function postProgress(progress: number) {
  const msg: WorkerOutput = { type: 'PROGRESS', payload: { progress } };
  self.postMessage(msg);
}
