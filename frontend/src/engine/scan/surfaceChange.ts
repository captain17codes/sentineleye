/**
 * Multi-index surface change for real Sentinel-2 L2A crops.
 *
 * Bands: B2 blue, B4 red, B8 NIR, B11 SWIR-1 (resampled to 10 m).
 *   NDVI     = (NIR - Red) / (NIR + Red)                                  vegetation
 *   BSI      = ((SWIR1 + Red) - (NIR + Blue)) / ((SWIR1 + Red) + (NIR + Blue))  bare soil
 *   Redness  = (Red - Blue) / (Red + Blue)                                bright roofs -> brown earth
 *
 * Steps
 *  1. Per-pixel change of each index between the two dates (cloud, shadow, no-data and water masked).
 *  2. Scene normalisation: subtract the median change of each index, which removes season and
 *     sensor differences that affect the whole image.
 *  3. Classify each pixel.
 *  4. Keep only compact clusters (5x5 density filter + minimum size), so scattered noise is dropped.
 *
 * Thresholds were calibrated on real crops: a documented demolition (Khori Gaon, 2021) and a real
 * no-change control site (Asola Bhatti).
 */

export interface SpectralBands {
  red: ArrayLike<number>;
  nir: ArrayLike<number>;
  blue: ArrayLike<number>;
  swir16: ArrayLike<number>;
}

export const CHANGE_CLASSES = [
  { id: 0, key: 'none', label: 'No significant change', color: [0, 0, 0, 0] },
  { id: 1, key: 'cleared', label: 'Cleared to bare earth (demolition, clearing, excavation)', color: [239, 68, 68, 215] },
  { id: 2, key: 'veg_loss', label: 'Vegetation loss', color: [250, 204, 21, 215] },
  { id: 3, key: 'veg_gain', label: 'Vegetation gain', color: [56, 189, 248, 170] },
] as const;

export type ChangeKey = (typeof CHANGE_CLASSES)[number]['key'];

export interface SurfaceThresholds {
  /** normalised redness rise (with no NDVI gain) that marks bare earth replacing roofs or surfaces */
  redness: number;
  /** normalised BSI rise that, with an NDVI drop, marks new bare soil */
  bsi: number;
  /** normalised NDVI drop that marks vegetation loss */
  vegLoss: number;
  /** normalised NDVI rise that marks vegetation gain */
  vegGain: number;
  /** share of changed pixels in a 5x5 window for a pixel to count as part of a cluster */
  density: number;
  /** minimum cluster size in pixels (25 px = 0.25 ha at 10 m) */
  minClusterPx: number;
}

export const DEFAULT_SURFACE_THRESHOLDS: SurfaceThresholds = {
  redness: 0.08,
  bsi: 0.1,
  vegLoss: -0.2,
  vegGain: 0.2,
  density: 0.45,
  minClusterPx: 25,
};

export interface ChangeCluster {
  pixels: number;
  areaM2: number;
  /** centroid in pixel coordinates (x = column, y = row) */
  cx: number;
  cy: number;
  /** dominant class key */
  kind: ChangeKey;
}

export interface SurfaceChangeResult {
  /** class per pixel, only for pixels inside kept clusters (vegetation gain kept as context) */
  classMap: Uint8Array;
  validPixels: number;
  clusters: ChangeCluster[];
  /** total clustered change area (cleared + vegetation loss) in m² */
  changedAreaM2: number;
  changedShare: number;
  areaM2: Record<ChangeKey, number>;
  /** median whole-scene change removed by normalisation */
  sceneShift: { ndvi: number; bsi: number; redness: number };
}

const nd = (a: number, b: number) => {
  const s = a + b;
  return s > 1e-6 ? (a - b) / s : 0;
};
export const ndviAt = (b: SpectralBands, i: number) => nd(b.nir[i], b.red[i]);
export const bsiAt = (b: SpectralBands, i: number) => nd(b.swir16[i] + b.red[i], b.nir[i] + b.blue[i]);
export const rednessAt = (b: SpectralBands, i: number) => nd(b.red[i], b.blue[i]);

function median(values: Float32Array, mask: Uint8Array): number {
  const v: number[] = [];
  for (let i = 0; i < values.length; i++) if (!mask[i]) v.push(values[i]);
  if (!v.length) return 0;
  v.sort((a, b) => a - b);
  return v[Math.floor(v.length / 2)];
}

export function analyzeSurfaceChange(
  t0: SpectralBands,
  t1: SpectralBands,
  invalid: ArrayLike<number> | null,
  size: number,
  th: SurfaceThresholds = DEFAULT_SURFACE_THRESHOLDS,
  pixelAreaM2 = 100
): SurfaceChangeResult {
  const n = size * size;
  const bad = new Uint8Array(n);
  const dN = new Float32Array(n);
  const dB = new Float32Array(n);
  const dR = new Float32Array(n);
  let valid = 0;
  for (let i = 0; i < n; i++) {
    if ((invalid && invalid[i]) || t0.red[i] <= 0 || t1.red[i] <= 0) {
      bad[i] = 1;
      continue;
    }
    valid++;
    dN[i] = ndviAt(t1, i) - ndviAt(t0, i);
    dB[i] = bsiAt(t1, i) - bsiAt(t0, i);
    dR[i] = rednessAt(t1, i) - rednessAt(t0, i);
  }

  // 2. scene normalisation
  const shift = { ndvi: median(dN, bad), bsi: median(dB, bad), redness: median(dR, bad) };

  // 3. per-pixel class
  const raw = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (bad[i]) continue;
    const vn = dN[i] - shift.ndvi;
    const vb = dB[i] - shift.bsi;
    const vr = dR[i] - shift.redness;
    if ((vr > th.redness && vn < 0.05) || (vb > th.bsi && vn < -0.1)) raw[i] = 1;
    else if (vn < th.vegLoss) raw[i] = 2;
    else if (vn > th.vegGain) raw[i] = 3;
  }

  // 4. density filter on change pixels (classes 1 and 2), via a summed-area table
  const sat = new Float64Array((size + 1) * (size + 1));
  for (let y = 0; y < size; y++) {
    let row = 0;
    for (let x = 0; x < size; x++) {
      const c = raw[y * size + x];
      row += c === 1 || c === 2 ? 1 : 0;
      sat[(y + 1) * (size + 1) + (x + 1)] = sat[y * (size + 1) + (x + 1)] + row;
    }
  }
  const r = 2;
  const dense = new Uint8Array(n);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      if (raw[i] !== 1 && raw[i] !== 2) continue;
      const x0 = Math.max(0, x - r), x1 = Math.min(size - 1, x + r);
      const y0 = Math.max(0, y - r), y1 = Math.min(size - 1, y + r);
      const sum =
        sat[(y1 + 1) * (size + 1) + (x1 + 1)] - sat[y0 * (size + 1) + (x1 + 1)] -
        sat[(y1 + 1) * (size + 1) + x0] + sat[y0 * (size + 1) + x0];
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      if (sum / area >= th.density) dense[i] = 1;
    }
  }

  // connected components (4-neighbour) of dense pixels
  const label = new Int32Array(n);
  const classMap = new Uint8Array(n);
  const clusters: ChangeCluster[] = [];
  const stack: number[] = [];
  let next = 0;
  for (let s = 0; s < n; s++) {
    if (!dense[s] || label[s]) continue;
    next++;
    const members: number[] = [];
    stack.push(s);
    label[s] = next;
    while (stack.length) {
      const i = stack.pop() as number;
      members.push(i);
      const x = i % size;
      const nbrs = [i - size, i + size, x > 0 ? i - 1 : -1, x < size - 1 ? i + 1 : -1];
      for (const j of nbrs) {
        if (j >= 0 && j < n && dense[j] && !label[j]) {
          label[j] = next;
          stack.push(j);
        }
      }
    }
    if (members.length < th.minClusterPx) continue;
    let sx = 0, sy = 0, cleared = 0;
    for (const i of members) {
      sx += i % size;
      sy += Math.floor(i / size);
      if (raw[i] === 1) cleared++;
      classMap[i] = raw[i];
    }
    clusters.push({
      pixels: members.length,
      areaM2: members.length * pixelAreaM2,
      cx: sx / members.length,
      cy: sy / members.length,
      kind: cleared >= members.length / 2 ? 'cleared' : 'veg_loss',
    });
  }
  clusters.sort((a, b) => b.pixels - a.pixels);

  // keep vegetation gain as faint context
  for (let i = 0; i < n; i++) if (raw[i] === 3) classMap[i] = 3;

  const areaM2: Record<ChangeKey, number> = { none: 0, cleared: 0, veg_loss: 0, veg_gain: 0 };
  for (let i = 0; i < n; i++) {
    if (classMap[i]) areaM2[CHANGE_CLASSES[classMap[i]].key] += pixelAreaM2;
  }
  const changedAreaM2 = areaM2.cleared + areaM2.veg_loss;

  return {
    classMap,
    validPixels: valid,
    clusters,
    changedAreaM2,
    changedShare: valid ? changedAreaM2 / (valid * pixelAreaM2) : 0,
    areaM2,
    sceneShift: shift,
  };
}

/** Pixel centre (x, y) -> [lng, lat] for a north-up crop with bbox [minLng, minLat, maxLng, maxLat]. */
export function pixelToLngLat(x: number, y: number, bbox: [number, number, number, number], size: number): [number, number] {
  return [bbox[0] + ((x + 0.5) / size) * (bbox[2] - bbox[0]), bbox[3] - ((y + 0.5) / size) * (bbox[3] - bbox[1])];
}

/** Great-circle distance in metres. */
export function distanceM(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad;
  const dLng = (b[0] - a[0]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** RGBA overlay (size x size) colouring each pixel by class. */
export function changeOverlayRGBA(classMap: Uint8Array, size: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < classMap.length; i++) {
    const col = CHANGE_CLASSES[classMap[i]].color;
    out[i * 4] = col[0];
    out[i * 4 + 1] = col[1];
    out[i * 4 + 2] = col[2];
    out[i * 4 + 3] = classMap[i] === 3 ? 90 : col[3];
  }
  return out;
}
