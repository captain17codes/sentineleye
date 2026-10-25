/**
 * Mulberry32 seeded PRNG — deterministic, fast, 32-bit output.
 * Same seed → identical sequence every time.
 */
export function mulberry32(seed: number) {
  let s = seed >>> 0;
  return function rand(): number {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type RandFn = ReturnType<typeof mulberry32>;

/** Random float in [min, max) */
export function randRange(rand: RandFn, min: number, max: number): number {
  return min + rand() * (max - min);
}

/** Random integer in [min, max] inclusive */
export function randInt(rand: RandFn, min: number, max: number): number {
  return Math.floor(randRange(rand, min, max + 1));
}

/** Pick one item from an array */
export function pick<T>(rand: RandFn, arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

/** Shuffle array in place using Fisher-Yates */
export function shuffle<T>(rand: RandFn, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
