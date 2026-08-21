/**
 * Light curve generator for Exoplanet Watch.
 *
 * Produces synthetic light curves for five astrophysical scenarios.
 * Every curve is fully deterministic given (type, seed, difficulty).
 * All downstream values (planet radius, etc.) are derived from the truth object.
 */

import {
  mulberry32,
  gaussianRandom,
  uniformRange,
  uniformInt,
} from './prng';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CurveType =
  | 'planet'
  | 'eclipsingBinary'
  | 'stellarVariability'
  | 'instrumentNoise'
  | 'insufficientData';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type SizeClass = 'Earth' | 'Neptune' | 'Jupiter';

export interface Point {
  t: number; // time in days
  flux: number; // normalised flux (baseline ≈ 1.0)
}

export interface PartialAnswer {
  answer: string;
  credit: number; // 0–1
}

export interface CurveTruth {
  type: CurveType;
  correctAnswer: string; // e.g. 'TRANSIT', 'NO TRANSIT', 'UNCERTAIN'
  partialAnswers?: PartialAnswer[];
  depth: number;
  period: number;
  duration: number; // hours
  epoch: number; // t0 in days
  transitTimes: number[];
  starRadiusSolar: number;
  starTempK: number;
  rpOverRs: number; // sqrt(depth)
  planetRadiusEarth: number; // rpOverRs * starRadiusSolar * 109.2
  sizeClass: SizeClass;
  noiseSigma: number;
  // Eclipsing binary specifics
  oddDepth?: number;
  evenDepth?: number;
}

export interface GeneratedCurve {
  points: Point[];
  truth: CurveTruth;
}

// ---------------------------------------------------------------------------
// Size class helper
// ---------------------------------------------------------------------------

function getSizeClass(radiusEarth: number): SizeClass {
  if (radiusEarth < 2) return 'Earth';
  if (radiusEarth <= 6) return 'Neptune';
  return 'Jupiter';
}

// ---------------------------------------------------------------------------
// Noise sigma scaling by difficulty
// ---------------------------------------------------------------------------

function noiseDifficultyScale(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy':
      return 0.6; // less noise
    case 'medium':
      return 1.0; // baseline
    case 'hard':
      return 1.5; // more noise
  }
}

// ---------------------------------------------------------------------------
// Stellar properties
// ---------------------------------------------------------------------------

function generateStellarProps(rng: () => number) {
  // Option A: Widen host star radius range to 0.35–1.80 R☉ (M-dwarfs to F-dwarfs)
  // so that visible transit depths (0.4%–3.0%) produce a realistic mix of
  // Neptune-class (2–6 R⊕) and Jupiter-class (> 6 R⊕) planets.
  const starRadiusSolar = uniformRange(rng, 0.35, 1.80);
  const starTempK = uniformRange(rng, 3200, 7500);
  return { starRadiusSolar, starTempK };
}

// ---------------------------------------------------------------------------
// Planet transit generator
// ---------------------------------------------------------------------------

function generatePlanet(
  rng: () => number,
  difficulty: Difficulty,
  marginal: boolean = false,
  overrides?: CurveOverrides
): GeneratedCurve {
  const { starRadiusSolar, starTempK } = generateStellarProps(rng);

  // Transit parameters: log-uniform depth sampling
  // Minimum depth floor by task:
  // - Default (Rounds 1 & 2 detection): 0.40% floor (0.0040)
  // - Explicit override / Round 3 measurement: 0.15% floor (0.0015)
  // - Marginal detection test: 0.10% to 0.20%
  const depthFloor = overrides?.depthFloor ?? (marginal ? 0.0010 : 0.0040);
  const logMin = Math.log(depthFloor);
  const logMax = Math.log(0.030);
  const depth = overrides?.depth ?? Math.exp(uniformRange(rng, logMin, logMax));
  const period = uniformRange(rng, 1.5, 8);
  const durationHours = uniformRange(rng, 1.5, 4.5);
  const durationDays = durationHours / 24;
  const epoch = uniformRange(rng, 0, period);
  const ingressFraction = uniformRange(rng, 0.10, 0.20);
  const tau = durationDays * ingressFraction; // ingress/egress duration in days

  // Noise: scale with depth and difficulty
  const baseNoiseSigma = uniformRange(rng, depth / 8, depth / 3);
  const noiseSigma = baseNoiseSigma * noiseDifficultyScale(difficulty);

  // Observation window: 14–20 days at 10-minute cadence (144 points/day)
  const totalDays = uniformRange(rng, 14, 20);
  const numPoints = Math.round((totalDays * 24 * 60) / 10);

  // Generate points
  const points: Point[] = [];
  const transitTimes: number[] = [];

  // Precompute transit times
  for (let n = 0; n * period + epoch < totalDays; n++) {
    transitTimes.push(n * period + epoch);
  }

  for (let i = 0; i < numPoints; i++) {
    const t = (i / (numPoints - 1)) * totalDays;
    let flux = 1.0;

    // Check each transit
    for (const tc of transitTimes) {
      const dt = t - tc;
      const halfDur = durationDays / 2;

      if (Math.abs(dt) <= halfDur) {
        // Inside transit window
        const distFromCenter = Math.abs(dt);
        const flatEnd = halfDur - tau;

        if (distFromCenter <= flatEnd) {
          // Flat bottom
          flux -= depth;
        } else {
          // Ingress/egress ramp
          const rampProgress = (halfDur - distFromCenter) / tau;
          flux -= depth * rampProgress;
        }
      }
    }

    // Add noise
    flux += gaussianRandom(rng) * noiseSigma;
    points.push({ t, flux });
  }

  const rpOverRs = Math.sqrt(depth);
  const planetRadiusEarth = rpOverRs * starRadiusSolar * 109.2;

  return {
    points,
    truth: {
      type: 'planet',
      correctAnswer: 'TRANSIT',
      partialAnswers: marginal
        ? [{ answer: 'UNCERTAIN', credit: 0.5 }]
        : undefined,
      depth,
      period,
      duration: durationHours,
      epoch,
      transitTimes,
      starRadiusSolar,
      starTempK,
      rpOverRs,
      planetRadiusEarth,
      sizeClass: getSizeClass(planetRadiusEarth),
      noiseSigma,
    },
  };
}

export interface CurveOverrides {
  depth?: number;
  depthFloor?: number;
  oddDepth?: number;
  evenDepth?: number;
  period?: number;
  durationHours?: number;
  epoch?: number;
  starRadiusSolar?: number;
}

// ---------------------------------------------------------------------------
// Eclipsing binary generator
// ---------------------------------------------------------------------------

function generateEclipsingBinary(
  rng: () => number,
  difficulty: Difficulty,
  overrides?: CurveOverrides
): GeneratedCurve {
  const { starRadiusSolar: defaultStarR, starTempK } = generateStellarProps(rng);
  const starRadiusSolar = overrides?.starRadiusSolar ?? defaultStarR;

  // Log-uniform depth range 2% to 25% (or explicit override)
  const logMin = Math.log(0.02);
  const logMax = Math.log(0.25);
  const baseDepth = overrides?.depth ?? Math.exp(uniformRange(rng, logMin, logMax));

  const period = overrides?.period ?? uniformRange(rng, 1.5, 8);
  const durationHours = overrides?.durationHours ?? uniformRange(rng, 1.5, 5);
  const durationDays = durationHours / 24;
  const epoch = overrides?.epoch ?? uniformRange(rng, 0, period);
  // V-shaped: tau = T/2 (no flat bottom)
  const tau = durationDays / 2;

  // Alternating depths: odd transits 10–20% deeper than even (or explicit overrides)
  const depthRatio = uniformRange(rng, 1.10, 1.20);
  const oddDepth = overrides?.oddDepth ?? (baseDepth * depthRatio);
  const evenDepth = overrides?.evenDepth ?? baseDepth;

  const baseNoiseSigma = uniformRange(rng, baseDepth / 10, baseDepth / 5);
  const noiseSigma = baseNoiseSigma * noiseDifficultyScale(difficulty);

  // Observation window: 14–20 days at 10-minute cadence
  const totalDays = uniformRange(rng, 14, 20);
  const numPoints = Math.round((totalDays * 24 * 60) / 10);

  const points: Point[] = [];
  const transitTimes: number[] = [];

  for (let n = 0; n * period + epoch < totalDays; n++) {
    transitTimes.push(n * period + epoch);
  }

  for (let i = 0; i < numPoints; i++) {
    const t = (i / (numPoints - 1)) * totalDays;
    let flux = 1.0;

    for (let idx = 0; idx < transitTimes.length; idx++) {
      const tc = transitTimes[idx];
      const dt = t - tc;
      const halfDur = durationDays / 2;
      // Odd/even alternating depth: 1st dip (idx=0) is oddDepth (deeper), 2nd dip (idx=1) is evenDepth
      const currentDepth = idx % 2 === 0 ? oddDepth : evenDepth;

      if (Math.abs(dt) <= halfDur) {
        const distFromCenter = Math.abs(dt);
        // V-shape: tau = halfDur, so always in ramp zone
        const rampProgress = (halfDur - distFromCenter) / tau;
        flux -= currentDepth * Math.min(rampProgress, 1.0);
      }
    }

    flux += gaussianRandom(rng) * noiseSigma;
    points.push({ t, flux });
  }

  // Use average depth for derived properties
  const avgDepth = (oddDepth + evenDepth) / 2;
  const rpOverRs = Math.sqrt(avgDepth);
  const planetRadiusEarth = rpOverRs * starRadiusSolar * 109.2;

  return {
    points,
    truth: {
      type: 'eclipsingBinary',
      correctAnswer: 'NO TRANSIT',
      depth: avgDepth,
      period,
      duration: durationHours,
      epoch,
      transitTimes,
      starRadiusSolar,
      starTempK,
      rpOverRs,
      planetRadiusEarth,
      sizeClass: getSizeClass(planetRadiusEarth),
      noiseSigma,
      oddDepth,
      evenDepth,
    },
  };
}

// ---------------------------------------------------------------------------
// Stellar variability generator
// ---------------------------------------------------------------------------

function generateStellarVariability(
  rng: () => number,
  difficulty: Difficulty
): GeneratedCurve {
  const { starRadiusSolar, starTempK } = generateStellarProps(rng);

  // 2–3 sine waves with incommensurate periods
  const numWaves = uniformInt(rng, 2, 3);
  const waves: { amplitude: number; period: number; phase: number }[] = [];
  for (let i = 0; i < numWaves; i++) {
    waves.push({
      amplitude: uniformRange(rng, 0.005, 0.02),
      period: uniformRange(rng, 2, 15), // days — incommensurate
      phase: uniformRange(rng, 0, 2 * Math.PI),
    });
  }

  const baseNoiseSigma = uniformRange(rng, 0.001, 0.003);
  const noiseSigma = baseNoiseSigma * noiseDifficultyScale(difficulty);

  // Observation window: 14–20 days at 10-minute cadence
  const totalDays = uniformRange(rng, 14, 20);
  const numPoints = Math.round((totalDays * 24 * 60) / 10);

  const points: Point[] = [];
  for (let i = 0; i < numPoints; i++) {
    const t = (i / (numPoints - 1)) * totalDays;
    let flux = 1.0;

    for (const w of waves) {
      flux += w.amplitude * Math.sin((2 * Math.PI * t) / w.period + w.phase);
    }

    flux += gaussianRandom(rng) * noiseSigma;
    points.push({ t, flux });
  }

  return {
    points,
    truth: {
      type: 'stellarVariability',
      correctAnswer: 'NO TRANSIT',
      depth: 0,
      period: 0,
      duration: 0,
      epoch: 0,
      transitTimes: [],
      starRadiusSolar,
      starTempK,
      rpOverRs: 0,
      planetRadiusEarth: 0,
      sizeClass: 'Earth',
      noiseSigma,
    },
  };
}

// ---------------------------------------------------------------------------
// Instrument noise generator
// ---------------------------------------------------------------------------

function generateInstrumentNoise(
  rng: () => number,
  difficulty: Difficulty
): GeneratedCurve {
  const { starRadiusSolar, starTempK } = generateStellarProps(rng);

  const baseNoiseSigma = uniformRange(rng, 0.002, 0.01);
  const noiseSigma = baseNoiseSigma * noiseDifficultyScale(difficulty);
  const numSpikes = uniformInt(rng, 3, 6);

  // Observation window: 14–20 days at 10-minute cadence
  const totalDays = uniformRange(rng, 14, 20);
  const numPoints = Math.round((totalDays * 24 * 60) / 10);

  const points: Point[] = [];

  // Pre-generate spike positions
  const spikeIndices: Set<number> = new Set();
  while (spikeIndices.size < numSpikes) {
    spikeIndices.add(uniformInt(rng, 0, numPoints - 1));
  }

  for (let i = 0; i < numPoints; i++) {
    const t = (i / (numPoints - 1)) * totalDays;
    let flux = 1.0 + gaussianRandom(rng) * noiseSigma;

    if (spikeIndices.has(i)) {
      // Random spike: 5–15x the noise sigma
      const spikeDir = rng() > 0.5 ? 1 : -1;
      flux += spikeDir * uniformRange(rng, 5, 15) * noiseSigma;
    }

    points.push({ t, flux });
  }

  return {
    points,
    truth: {
      type: 'instrumentNoise',
      correctAnswer: 'NO TRANSIT',
      depth: 0,
      period: 0,
      duration: 0,
      epoch: 0,
      transitTimes: [],
      starRadiusSolar,
      starTempK,
      rpOverRs: 0,
      planetRadiusEarth: 0,
      sizeClass: 'Earth',
      noiseSigma,
    },
  };
}

// ---------------------------------------------------------------------------
// Insufficient data generator
// ---------------------------------------------------------------------------

function generateInsufficientData(
  rng: () => number,
  difficulty: Difficulty
): GeneratedCurve {
  const { starRadiusSolar, starTempK } = generateStellarProps(rng);

  // A single planet-like transit
  const depth = uniformRange(rng, 0.005, 0.025);
  const period = uniformRange(rng, 8, 15); // long period so second transit isn't seen
  const durationHours = uniformRange(rng, 1.5, 5);
  const durationDays = durationHours / 24;
  const ingressFraction = uniformRange(rng, 0.10, 0.20);
  const tau = durationDays * ingressFraction;

  // Place transit in first third of observation window
  // Then truncate observation so no second transit could be seen
  const epoch = uniformRange(rng, 1, 5); // transit happens early

  // Total observation is less than epoch + period (so no second transit visible)
  const totalDays = uniformRange(rng, epoch + 2, epoch + period * 0.7);
  const numPoints = uniformInt(rng, 600, 1200);

  const baseNoiseSigma = uniformRange(rng, depth / 8, depth / 3);
  const noiseSigma = baseNoiseSigma * noiseDifficultyScale(difficulty);

  const points: Point[] = [];

  for (let i = 0; i < numPoints; i++) {
    const t = (i / (numPoints - 1)) * totalDays;
    let flux = 1.0;

    // Single transit at epoch
    const dt = t - epoch;
    const halfDur = durationDays / 2;

    if (Math.abs(dt) <= halfDur) {
      const distFromCenter = Math.abs(dt);
      const flatEnd = halfDur - tau;

      if (distFromCenter <= flatEnd) {
        flux -= depth;
      } else {
        const rampProgress = (halfDur - distFromCenter) / tau;
        flux -= depth * rampProgress;
      }
    }

    flux += gaussianRandom(rng) * noiseSigma;
    points.push({ t, flux });
  }

  const rpOverRs = Math.sqrt(depth);
  const planetRadiusEarth = rpOverRs * starRadiusSolar * 109.2;

  return {
    points,
    truth: {
      type: 'insufficientData',
      correctAnswer: 'UNCERTAIN',
      depth,
      period,
      duration: durationHours,
      epoch,
      transitTimes: [epoch],
      starRadiusSolar,
      starTempK,
      rpOverRs,
      planetRadiusEarth,
      sizeClass: getSizeClass(planetRadiusEarth),
      noiseSigma,
    },
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Generate a light curve of the given type, fully determined by seed + difficulty.
 * The `marginal` flag is only used for 'planet' type to produce a barely-detectable transit.
 */
export function generateCurve(
  type: CurveType,
  seed: number,
  difficulty: Difficulty = 'medium',
  marginal: boolean = false,
  overrides?: CurveOverrides
): GeneratedCurve {
  const rng = mulberry32(seed);

  switch (type) {
    case 'planet':
      return generatePlanet(rng, difficulty, marginal, overrides);
    case 'eclipsingBinary':
      return generateEclipsingBinary(rng, difficulty, overrides);
    case 'stellarVariability':
      return generateStellarVariability(rng, difficulty);
    case 'instrumentNoise':
      return generateInstrumentNoise(rng, difficulty);
    case 'insufficientData':
      return generateInsufficientData(rng, difficulty);
  }
}

// ---------------------------------------------------------------------------
// Convenience: generate all types for visual QA
// ---------------------------------------------------------------------------

export function generateAllTypes(
  seed: number,
  difficulty: Difficulty = 'medium'
): Record<CurveType, GeneratedCurve> {
  return {
    planet: generateCurve('planet', seed, difficulty),
    eclipsingBinary: generateCurve('eclipsingBinary', seed + 1, difficulty),
    stellarVariability: generateCurve('stellarVariability', seed + 2, difficulty),
    instrumentNoise: generateCurve('instrumentNoise', seed + 3, difficulty),
    insufficientData: generateCurve('insufficientData', seed + 4, difficulty),
  };
}
