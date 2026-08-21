/**
 * Scoring engine for Exoplanet Watch.
 *
 * The weighting table is the SINGLE SOURCE OF TRUTH:
 *
 * | Round       | Accuracy | Data Analysis | Reasoning | Time |
 * |-------------|----------|---------------|-----------|------|
 * | Detection   | 50%      | 20%           | 20%       | 10%  |
 * | Validation  | 40%      | 20%           | 30%       | 10%  |
 * | Data Room   | 30%      | 40%           | 20%       | 10%  |
 * | Confirmation| 25%      | 30%           | 35%       | 10%  |
 *
 * Reasoning is NEVER auto-scored. It is marked "pending judge review".
 * Display shows auto-scored subtotal (normalized over scorable portion)
 * plus "X% pending judge review".
 */

import type { RoundNumber, RoundScore, Round1CurveSubmission, Round2CaseSubmission, Round3Submission } from './gameState';
import type { CurveTruth } from './lightcurve';

// NOTE: ROUND_WEIGHTS is the single source of truth for round scoring weights.
// If changed, also update Scene11Visual in src/components/tutorial/TutorialScenes.tsx!
export const ROUND_WEIGHTS: Record<RoundNumber, {
  accuracy: number;
  dataAnalysis: number;
  reasoning: number;
  time: number;
}> = {
  1: { accuracy: 0.50, dataAnalysis: 0.20, reasoning: 0.20, time: 0.10 },
  2: { accuracy: 0.40, dataAnalysis: 0.20, reasoning: 0.30, time: 0.10 },
  3: { accuracy: 0.30, dataAnalysis: 0.40, reasoning: 0.20, time: 0.10 },
  4: { accuracy: 0.25, dataAnalysis: 0.30, reasoning: 0.35, time: 0.10 },
};

// ---------------------------------------------------------------------------
// Time scoring
// ---------------------------------------------------------------------------

const ROUND_TARGET_TIMES_MS: Record<RoundNumber, number> = {
  1: 20 * 60 * 1000,
  2: 60 * 60 * 1000,
  3: 50 * 60 * 1000,
  4: 75 * 60 * 1000,
};

/** Score time: 100 if under target, decreasing to 0 at 2x target */
export function scoreTime(round: RoundNumber, elapsedMs: number): number {
  const target = ROUND_TARGET_TIMES_MS[round];
  if (elapsedMs <= target) return 100;
  const overtime = (elapsedMs - target) / target;
  return Math.max(0, Math.round(100 * (1 - overtime)));
}

// ---------------------------------------------------------------------------
// Round 1 — Detection
// ---------------------------------------------------------------------------

const TRANSIT_TIME_TOLERANCE = 0.15; // days — how close a marker must be to a true transit

export function scoreRound1(
  submissions: Round1CurveSubmission[],
  truths: CurveTruth[],
  elapsedMs: number,
): RoundScore {
  let accuracyTotal = 0;
  let dataAnalysisTotal = 0;
  let accuracyCount = 0;
  let dataAnalysisCount = 0;

  for (const sub of submissions) {
    const truth = truths[sub.curveIndex];
    if (!truth || !sub.classification) continue;

    // Accuracy: compare classification to truth.correctAnswer
    accuracyCount++;
    if (sub.classification === truth.correctAnswer) {
      accuracyTotal += 100;
    } else if (truth.partialAnswers) {
      const partial = truth.partialAnswers.find(
        (p) => p.answer === sub.classification
      );
      if (partial) {
        accuracyTotal += partial.credit * 100;
      }
    }

    // Data analysis: did their dip markers land near true transit times?
    if (truth.transitTimes.length > 0) {
      dataAnalysisCount++;
      let matchedTransits = 0;
      for (const tt of truth.transitTimes) {
        const hasMarkerNear = sub.dipMarkers.some(
          (m) => Math.abs(m.t - tt) < TRANSIT_TIME_TOLERANCE
        );
        if (hasMarkerNear) matchedTransits++;
      }
      // Score based on fraction of transits found (penalise false positives mildly)
      const recall = matchedTransits / truth.transitTimes.length;
      const falsePositives = sub.dipMarkers.filter(
        (m) => !truth.transitTimes.some((tt) => Math.abs(m.t - tt) < TRANSIT_TIME_TOLERANCE)
      ).length;
      const precision =
        sub.dipMarkers.length > 0
          ? (sub.dipMarkers.length - falsePositives) / sub.dipMarkers.length
          : 1;
      // F1-ish score
      const f1 = recall + precision > 0 ? (2 * recall * precision) / (recall + precision) : 0;
      dataAnalysisTotal += f1 * 100;
    } else {
      // No transits — data analysis score is based on not placing markers
      dataAnalysisCount++;
      if (sub.dipMarkers.length === 0) {
        dataAnalysisTotal += 100;
      } else {
        // Penalty for false markers
        dataAnalysisTotal += Math.max(0, 100 - sub.dipMarkers.length * 25);
      }
    }
  }

  const accuracy = accuracyCount > 0 ? Math.round(accuracyTotal / accuracyCount) : 0;
  const dataAnalysis = dataAnalysisCount > 0 ? Math.round(dataAnalysisTotal / dataAnalysisCount) : 0;
  const time = scoreTime(1, elapsedMs);
  const weight = ROUND_WEIGHTS[1];

  return {
    accuracy,
    dataAnalysis,
    reasoning: -1, // pending judge review
    time,
    total: Math.round(
      accuracy * weight.accuracy +
      dataAnalysis * weight.dataAnalysis +
      time * weight.time
    ),
    weight,
  };
}

// ---------------------------------------------------------------------------
// Round 2 — Validation
// ---------------------------------------------------------------------------

export function scoreRound2(
  submissions: Round2CaseSubmission[],
  truths: CurveTruth[],
  elapsedMs: number,
): RoundScore {
  let accuracyTotal = 0;
  let dataAnalysisTotal = 0;
  let count = 0;

  // Map curve types to expected Round 2 answers
  const round2AnswerMap: Record<string, string> = {
    planet: 'PLANET CANDIDATE',
    eclipsingBinary: 'FALSE POSITIVE',
    stellarVariability: 'FALSE POSITIVE',
    instrumentNoise: 'FALSE POSITIVE',
    insufficientData: 'INSUFFICIENT DATA',
  };

  for (const sub of submissions) {
    const truth = truths[sub.caseIndex];
    if (!truth || !sub.classification) continue;
    count++;

    const expectedAnswer = round2AnswerMap[truth.type] || truth.correctAnswer;
    if (sub.classification === expectedAnswer) {
      accuracyTotal += 100;
    }

    // Data analysis: did they click a meaningful feature?
    // For planet: marker near transit, for binary: marker near a transit
    // For variability: marker anywhere in the wave, for noise: marker on a spike
    if (sub.featureMarkers.length > 0) {
      if (truth.transitTimes.length > 0) {
        const hasNear = sub.featureMarkers.some(
          (m) => truth.transitTimes.some((tt) => Math.abs(m.t - tt) < TRANSIT_TIME_TOLERANCE * 2)
        );
        dataAnalysisTotal += hasNear ? 100 : 30;
      } else {
        // Non-transit types — having any marker is credit for engagement
        dataAnalysisTotal += 60;
      }
    }
  }

  const accuracy = count > 0 ? Math.round(accuracyTotal / count) : 0;
  const dataAnalysis = count > 0 ? Math.round(dataAnalysisTotal / count) : 0;
  const time = scoreTime(2, elapsedMs);
  const weight = ROUND_WEIGHTS[2];

  return {
    accuracy,
    dataAnalysis,
    reasoning: -1,
    time,
    total: Math.round(
      accuracy * weight.accuracy +
      dataAnalysis * weight.dataAnalysis +
      time * weight.time
    ),
    weight,
  };
}

// ---------------------------------------------------------------------------
// Round 3 — Data Room
// ---------------------------------------------------------------------------

interface Round3ToleranceBand {
  fullMarksFraction: number;
  halfMarksFraction: number;
}

const ROUND3_TOLERANCES: Record<string, Round3ToleranceBand> = {
  depth: { fullMarksFraction: 0.15, halfMarksFraction: 0.30 }, // 15% full marks / 30% half marks to balance pixel grid quantization
  period: { fullMarksFraction: 0.10, halfMarksFraction: 0.25 },
  duration: { fullMarksFraction: 0.10, halfMarksFraction: 0.25 },
};

function toleranceScore(measured: number, truth: number, band: Round3ToleranceBand): number {
  if (truth === 0) return measured === 0 ? 100 : 0;
  const error = Math.abs(measured - truth) / Math.abs(truth);
  if (error <= band.fullMarksFraction) return 100;
  if (error <= band.halfMarksFraction) return 50;
  return 0;
}

/**
 * Score Rp/Rs and planet radius on INTERNAL CONSISTENCY, not absolute truth.
 * Compare against what the player should have derived from their own measured depth.
 */
function internalConsistencyScore(
  playerDepth: number,
  playerRpRs: number,
  playerRadius: number,
  starRadiusSolar: number,
): { rpRsScore: number; radiusScore: number } {
  // What they should have derived from their own depth
  const expectedRpRs = Math.sqrt(playerDepth);
  const expectedRadius = playerRpRs * starRadiusSolar * 109.2;

  const rpRsError = expectedRpRs > 0 ? Math.abs(playerRpRs - expectedRpRs) / expectedRpRs : 0;
  const radiusError = expectedRadius > 0 ? Math.abs(playerRadius - expectedRadius) / expectedRadius : 0;

  // 5% full, 15% half
  const rpRsScore = rpRsError <= 0.05 ? 100 : rpRsError <= 0.15 ? 50 : 0;
  const radiusScore = radiusError <= 0.05 ? 100 : radiusError <= 0.15 ? 50 : 0;

  return { rpRsScore, radiusScore };
}

export function scoreRound3(
  submission: Round3Submission,
  truth: CurveTruth,
  elapsedMs: number,
): RoundScore {
  const playerDepth = parseFloat(submission.depthPercent) / 100 || 0;
  const playerRpRs = parseFloat(submission.rpOverRs) || 0;
  const playerRadius = parseFloat(submission.planetRadiusEarth) || 0;
  const playerPeriod = parseFloat(submission.orbitalPeriod) || 0;

  // Accuracy: depth, period, size class
  const depthScore = toleranceScore(playerDepth, truth.depth, ROUND3_TOLERANCES.depth);
  const periodScore = toleranceScore(playerPeriod, truth.period, ROUND3_TOLERANCES.period);
  const sizeClassScore = submission.sizeClass === truth.sizeClass ? 100 : 0;

  // Data analysis: precision of measurements + internal consistency
  const { rpRsScore, radiusScore } = internalConsistencyScore(
    playerDepth,
    playerRpRs,
    playerRadius,
    truth.starRadiusSolar,
  );

  const accuracy = Math.round((depthScore + periodScore + sizeClassScore) / 3);
  const dataAnalysis = Math.round((depthScore + periodScore + rpRsScore + radiusScore) / 4);
  const time = scoreTime(3, elapsedMs);
  const weight = ROUND_WEIGHTS[3];

  return {
    accuracy,
    dataAnalysis,
    reasoning: -1,
    time,
    total: Math.round(
      accuracy * weight.accuracy +
      dataAnalysis * weight.dataAnalysis +
      time * weight.time
    ),
    weight,
  };
}

// ---------------------------------------------------------------------------
// Round 4 — Confirmation (mostly qualitative)
// ---------------------------------------------------------------------------

export function scoreRound4(
  fellForMisleading: boolean,
  correctVerdict: boolean,
  elapsedMs: number,
): RoundScore {
  const accuracy = correctVerdict ? 100 : 0;
  const dataAnalysis = fellForMisleading ? 20 : 100; // big penalty for trusting misleading evidence
  const time = scoreTime(4, elapsedMs);
  const weight = ROUND_WEIGHTS[4];

  return {
    accuracy,
    dataAnalysis,
    reasoning: -1,
    time,
    total: Math.round(
      accuracy * weight.accuracy +
      dataAnalysis * weight.dataAnalysis +
      time * weight.time
    ),
    weight,
  };
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/** Get the auto-scored total (excluding reasoning weight) */
export function getAutoScoredTotal(score: RoundScore): number {
  return score.total;
}

/** Get the reasoning weight as a percentage string */
export function getPendingReasoningPercent(score: RoundScore): string {
  return `${Math.round(score.weight.reasoning * 100)}%`;
}

/** Get cumulative score across all completed rounds */
export function getCumulativeScore(scores: Partial<Record<RoundNumber, RoundScore>>): number {
  let total = 0;
  let count = 0;
  for (const round of [1, 2, 3, 4] as RoundNumber[]) {
    const score = scores[round];
    if (score) {
      total += score.total;
      count++;
    }
  }
  return count > 0 ? Math.round(total / count) : 0;
}
