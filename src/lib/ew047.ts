/**
 * EW-047 — Round 4's fixed target.
 *
 * HARDCODED SEED — not derived from team name.
 * Round 4 must be identical for every team so a human judge
 * can compare reports side-by-side.
 *
 * This is a genuine eclipsing binary disguised as a planet:
 * - Borderline planet-plausible depth (~3–4%)
 * - Subtle odd/even depth difference (10–12%)
 * - Two observation epochs
 *
 * Non-light-curve evidence is HAND-AUTHORED (not generated):
 * centroid shift, nearby star, magnitude, astronomer's note, etc.
 */

import { generateCurve, type GeneratedCurve } from './lightcurve';

// Fixed seed for ALL teams
const EW047_SEED = 47047047;

// ---------------------------------------------------------------------------
// Light curves (generated)
// ---------------------------------------------------------------------------

/** Primary observation — eclipsing binary with planet-plausible depth */
export const EW047_PRIMARY: GeneratedCurve = generateCurve(
  'eclipsingBinary',
  EW047_SEED,
  'medium'
);

/** Second observation — same system, different epoch */
export const EW047_SECONDARY: GeneratedCurve = generateCurve(
  'eclipsingBinary',
  EW047_SEED + 1000,
  'medium'
);

// ---------------------------------------------------------------------------
// Hand-authored stellar properties
// ---------------------------------------------------------------------------

export const EW047_STELLAR = {
  targetId: 'EW-047',
  starName: 'TIC 2847391',
  ra: '19h 42m 31.2s',
  dec: '+38° 14\' 22.8"',
  magnitude: 11.3,
  spectralType: 'G2V',
  stellarClass: 'Main Sequence',
  radiusSolar: 1.02,
  massSolar: 0.98,
  temperatureK: 5780,
  metallicity: -0.05, // [Fe/H]
  distance: '312 pc',
  luminositySolar: 0.97,
};

// ---------------------------------------------------------------------------
// Hand-authored transit data
// (these should be close to what the generated curves produce,
//  but presented as "measured" values from prior analysis)
// ---------------------------------------------------------------------------

export const EW047_TRANSIT_DATA = {
  depth: 0.034, // 3.4% — borderline deep for a planet
  depthUncertainty: 0.003,
  duration: 3.2, // hours
  period: 4.73, // days
  periodUncertainty: 0.01,
  epoch: 2457891.234, // BJD
  transitCount: 7,
};

// ---------------------------------------------------------------------------
// Hand-authored false-positive checks
// ---------------------------------------------------------------------------

export const EW047_FP_CHECKS = {
  oddEvenDepth: {
    oddDepthPercent: 3.65,
    evenDepthPercent: 3.18,
    differencePercent: 14.8,
    significance: '2.1σ',
    note: 'Marginal difference — could be statistical noise at this SNR, but consistent across both observations.',
  },
  centroidShift: {
    detected: true,
    shiftArcsec: 0.42,
    note: 'Small but non-zero centroid shift detected during transit. Consistent with a nearby contaminating source within the photometric aperture.',
  },
  nearbyStars: {
    detected: true,
    separationArcsec: 3.8,
    deltaMagnitude: 4.2,
    note: 'A faint companion (ΔV = 4.2 mag) at 3.8" separation falls within the standard photometric aperture. Could dilute the apparent transit depth.',
  },
  depthConsistency: {
    primaryDepthPercent: 3.41,
    secondaryDepthPercent: 3.38,
    consistent: true,
    note: 'Transit depth consistent across both observation epochs.',
  },
};

// ---------------------------------------------------------------------------
// Hand-authored astronomer's notes
// ---------------------------------------------------------------------------

export const EW047_ASTRONOMER_NOTES = {
  author: 'Dr. K. Vasquez, ExoSearch Collaboration',
  date: 'August 2025',
  text: `This is a strong Jupiter-class candidate, consistent with prior transit surveys of the Kepler field. The host star is a solar analogue with well-characterised properties, and the transit signal has been independently recovered in both observation epochs with consistent depth and ephemeris.

The measured transit depth of 3.4% implies a companion radius of ~2.0 R_Jupiter, placing it firmly in the gas-giant regime. The orbital period of 4.73 days is typical of hot Jupiters in close-in orbits.

I recommend this target for immediate radial-velocity follow-up to confirm the planetary nature of the companion and constrain its mass.`,
  // THIS IS THE MISLEADING EVIDENCE.
  // The astronomer's note confidently asserts this is a planet,
  // but the odd/even depth difference and centroid shift suggest
  // it's actually an eclipsing binary.
  isMisleading: true,
};

// ---------------------------------------------------------------------------
// Evidence cards structure
// ---------------------------------------------------------------------------

export interface EvidenceCard {
  index: number;
  title: string;
  category: string;
  isMisleading: boolean;
  hasInteractiveCurve: boolean;
}

export const EW047_EVIDENCE_CARDS: EvidenceCard[] = [
  {
    index: 0,
    title: 'Primary Light Curve',
    category: 'Photometric Data',
    isMisleading: false,
    hasInteractiveCurve: true,
  },
  {
    index: 1,
    title: 'Second Observation',
    category: 'Photometric Data',
    isMisleading: false,
    hasInteractiveCurve: true,
  },
  {
    index: 2,
    title: 'Stellar Information',
    category: 'Host Star',
    isMisleading: false,
    hasInteractiveCurve: false,
  },
  {
    index: 3,
    title: 'Transit Parameters',
    category: 'Signal Analysis',
    isMisleading: false,
    hasInteractiveCurve: false,
  },
  {
    index: 4,
    title: 'False-Positive Checks',
    category: 'Validation Tests',
    isMisleading: false,
    hasInteractiveCurve: false,
  },
  {
    index: 5,
    title: "Astronomer's Notes",
    category: 'Expert Assessment',
    isMisleading: false,
    hasInteractiveCurve: false,
  },
  {
    index: 6,
    title: 'Survey Classification Report',
    category: 'External Reference',
    isMisleading: true, // THE misleading item
    hasInteractiveCurve: false,
  },
];

// The misleading item's content
export const EW047_MISLEADING_REPORT = {
  title: 'Automated Survey Classification: PLANET CANDIDATE (High Confidence)',
  source: 'ExoTransit Automated Pipeline v4.2',
  date: 'July 2025',
  text: `Target EW-047 has been flagged as a HIGH-CONFIDENCE planet candidate by the ExoTransit automated classification pipeline. The system analysed 847 candidates in this survey field and assigned EW-047 a disposition score of 0.94 (threshold for planet candidate: 0.75).

Key pipeline findings:
• Transit shape: consistent with planetary transit model (χ² = 1.03)
• Depth-radius relation: compatible with Jupiter-class companion
• Ephemeris stability: excellent across all observed epochs
• No secondary eclipse detected above noise floor

Note: This automated classification has not been vetted by human review. The pipeline does not perform centroid analysis or nearby-star contamination checks.`,
  // The last line is the subtle tell — the pipeline explicitly
  // says it doesn't check the things that would reveal the EB nature.
  isMisleading: true,
};
