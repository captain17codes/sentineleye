/**
 * NDVI (Normalized Difference Vegetation Index) calculations
 * Formula: NDVI = (NIR - Red) / (NIR + Red)
 * Range: [-1, +1]
 */

export function computeNdviPixel(nir: number, red: number): number {
  const sum = nir + red;
  if (sum <= 0.0001) return 0;
  return (nir - red) / sum;
}

export function computeNdviGrid(nirGrid: Float32Array, redGrid: Float32Array, size: number): Float32Array {
  const total = size * size;
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    out[i] = computeNdviPixel(nirGrid[i], redGrid[i]);
  }
  return out;
}

export function computeNdviDiff(ndviT1: Float32Array, ndviT0: Float32Array, size: number): Float32Array {
  const total = size * size;
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    out[i] = ndviT1[i] - ndviT0[i];
  }
  return out;
}
