/**
 * Seeded PRNG utilities.
 * Uses mulberry32 — a fast 32-bit PRNG with good statistical properties.
 * NEVER use Math.random() in data-affecting code paths.
 */

/** mulberry32: seeded 32-bit PRNG returning values in [0, 1) */
export function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller transform: generate a Gaussian random number with mean 0, stddev 1 */
export function gaussianRandom(rng: () => number): number {
  let u1 = rng();
  let u2 = rng();
  // Avoid log(0)
  while (u1 === 0) u1 = rng();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/** Generate a Gaussian random number with given mean and standard deviation */
export function gaussianRandomWithParams(
  rng: () => number,
  mean: number,
  stddev: number
): number {
  return mean + stddev * gaussianRandom(rng);
}

/** Deterministic 32-bit hash from a string (djb2 variant) */
export function hashString(s: string): number {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash + s.charCodeAt(i)) | 0;
  }
  // Ensure positive
  return hash >>> 0;
}

/** Get a value uniformly distributed in [min, max) */
export function uniformRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Get an integer uniformly distributed in [min, max] (inclusive) */
export function uniformInt(rng: () => number, min: number, max: number): number {
  return Math.floor(min + rng() * (max - min + 1));
}
