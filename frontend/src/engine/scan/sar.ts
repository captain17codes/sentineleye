/**
 * SAR (Synthetic Aperture Radar) backscatter difference and speckle filtering.
 * Backscatter is in dB (decibels).
 */

export function speckleFilter3x3(input: Float32Array, size: number): Float32Array {
  const output = new Float32Array(size * size);
  const window = new Float32Array(9);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = Math.min(Math.max(x + dx, 0), size - 1);
          const ny = Math.min(Math.max(y + dy, 0), size - 1);
          window[count++] = input[ny * size + nx];
        }
      }
      // Simple 3x3 median
      window.subarray(0, count).sort();
      output[y * size + x] = window[4];
    }
  }

  return output;
}

export function computeSarDiff(sarT1: Float32Array, sarT0: Float32Array, size: number, applyFilter = true): Float32Array {
  const total = size * size;
  const rawDiff = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    rawDiff[i] = sarT1[i] - sarT0[i];
  }
  return applyFilter ? speckleFilter3x3(rawDiff, size) : rawDiff;
}
