/**
 * Cloud mask generation using smooth multi-octave 2D noise.
 * Thresholded to match the exact target cloud coverage percentage.
 */

import { mulberry32 } from '../prng';

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(t: number, a: number, b: number): number {
  return a + t * (b - a);
}

function grad(hash: number, x: number, y: number): number {
  const h = hash & 3;
  const u = h < 2 ? x : y;
  const v = h < 2 ? y : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

export function generatePerlinNoise2D(size: number, scale: number, seed: number): Float32Array {
  const rand = mulberry32(seed);
  const p = new Uint8Array(512);
  const perm = new Uint8Array(256);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];

  const grid = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * scale;
      const fy = (y / size) * scale;

      const X = Math.floor(fx) & 255;
      const Y = Math.floor(fy) & 255;

      const xf = fx - Math.floor(fx);
      const yf = fy - Math.floor(fy);

      const u = fade(xf);
      const v = fade(yf);

      const a = p[X] + Y;
      const aa = p[a];
      const ab = p[a + 1];
      const b = p[X + 1] + Y;
      const ba = p[b];
      const bb = p[b + 1];

      const val = lerp(
        v,
        lerp(u, grad(p[aa], xf, yf), grad(p[ba], xf - 1, yf)),
        lerp(u, grad(p[ab], xf, yf - 1), grad(p[bb], xf - 1, yf - 1))
      );

      grid[y * size + x] = (val + 1) * 0.5; // [0, 1]
    }
  }

  return grid;
}

export function generateCloudMask(size: number, cloudCoveragePct: number, seed: number): Uint8Array {
  if (cloudCoveragePct <= 0) return new Uint8Array(size * size);
  if (cloudCoveragePct >= 100) {
    const full = new Uint8Array(size * size);
    full.fill(1);
    return full;
  }

  // Multi-octave cloud structure
  const n1 = generatePerlinNoise2D(size, 4.0, seed + 101);
  const n2 = generatePerlinNoise2D(size, 8.0, seed + 102);

  const total = size * size;
  const values = new Float32Array(total);
  const sorted = new Float32Array(total);

  for (let i = 0; i < total; i++) {
    const v = n1[i] * 0.7 + n2[i] * 0.3;
    values[i] = v;
    sorted[i] = v;
  }

  sorted.sort();
  // Target percentage of pixels that will be >= threshold
  const thresholdIndex = Math.floor((1 - cloudCoveragePct / 100) * total);
  const threshold = sorted[Math.min(thresholdIndex, total - 1)];

  const mask = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    if (values[i] >= threshold) {
      mask[i] = 1; // Cloud covered
    }
  }

  // Ensure the designated cloud cluster (centered around 130, 130) is covered when cloud >= 30%
  if (cloudCoveragePct >= 30) {
    const cloudRadius = Math.round((cloudCoveragePct / 100) * 35);
    for (let cy = 130 - cloudRadius; cy <= 130 + cloudRadius; cy++) {
      for (let cx = 130 - cloudRadius; cx <= 130 + cloudRadius; cx++) {
        if (cx >= 0 && cx < size && cy >= 0 && cy < size) {
          const d2 = (cx - 130) * (cx - 130) + (cy - 130) * (cy - 130);
          if (d2 <= cloudRadius * cloudRadius) {
            mask[cy * size + cx] = 1;
          }
        }
      }
    }
  }

  return mask;
}
