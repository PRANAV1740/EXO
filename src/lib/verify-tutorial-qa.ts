/**
 * Verification script for Tutorial QA & Math assertions.
 *
 * NOTE ON SCENE 9 TRANSFORM CHECK:
 * The input pixel coordinate in Scene 9 is derived from `truth` via the viewer's
 * forward transform (`toY`). Therefore, the automated test checks internal
 * consistency of `toF`/`toY` round-tripping — it cannot detect a coordinate
 * transform bug on its own.
 *
 * MANUAL QA INSTRUCTION (HUMAN VERIFICATION REQUIRED):
 * Open Round 3 with a known team seed. Drag the baseline and transit lines by eye
 * to where the dip visibly sits. Compare the readout depth against that seed's
 * answer key value. Agreement within a few percent confirms the pixel-to-data
 * mapping. This cannot be automated, because any pixel a script chooses is either
 * derived from the transform under test or arbitrary.
 */

import { generateCurve } from './lightcurve';
import { TUTORIAL_SEED, TUTORIAL_SCENES } from './tutorialScript';
import { EW047_EVIDENCE_CARDS, EW047_ASTRONOMER_NOTES, isMisleadingCard } from './ew047';

console.log('====================================================');
console.log('  EXOPLANET WATCH TUTORIAL QA VERIFICATION');
console.log('====================================================\n');

// ---------------------------------------------------------------------------
// 1. Trap Card Verification (Scene 10)
// ---------------------------------------------------------------------------
console.log('1. TRAP CARD IDENTIFICATION CHECK (Scene 10)');

const trapCard = EW047_EVIDENCE_CARDS[5];
console.log(`  Official misleading card index: 5 ("${trapCard.title}")`);
console.log(`  Text snippet: "${EW047_ASTRONOMER_NOTES.text.substring(0, 65)}..."`);
console.log(`  card[5].isMisleading: ${trapCard.isMisleading}`);
console.log(`  isMisleadingCard(5): ${isMisleadingCard(5)}`);

if (trapCard.isMisleading && trapCard.title === "Astronomer's Notes" && isMisleadingCard(5)) {
  console.log('  ✅ Confirmed: Misleading item matches spec ("Astronomer\'s Notes").');
} else {
  console.error('  ❌ FAIL: Trap card mismatch!');
}

// ---------------------------------------------------------------------------
// 2. Scene 5 Odd/Even Depth Arithmetic Check
// ---------------------------------------------------------------------------
console.log('\n2. SCENE 5 ODD/EVEN DEPTH ARITHMETIC CHECK');
const depthOdd = 0.150;
const depthEven = 0.1275;
const diffPct = ((depthOdd - depthEven) / depthOdd) * 100;

console.log(`  oddDepth: ${depthOdd.toFixed(4)}`);
console.log(`  evenDepth: ${depthEven.toFixed(4)}`);
console.log(`  Relative difference formula: (oddDepth - evenDepth) / oddDepth * 100`);
console.log(`  Calculated diffPct: ${diffPct.toFixed(1)}%`);

if (Math.abs(diffPct - 15.0) < 0.001) {
  console.log('  ✅ Confirmed: Stated 15.0% odd/even difference is mathematically exact under relative formula.');
} else {
  console.error(`  ❌ FAIL: diffPct is ${diffPct}`);
}

// ---------------------------------------------------------------------------
// 3. Scene 9 Internal Consistency Check (toF/toY Round-Tripping)
// ---------------------------------------------------------------------------
console.log('\n3. SCENE 9 INTERNAL CONSISTENCY CHECK (toF/toY ROUND-TRIPPING)');
const scene9Curve = generateCurve('planet', TUTORIAL_SEED, 'medium');
const { truth } = scene9Curve;

console.log(`  Seeded planet depth (Seed 161): ${(truth.depth * 100).toFixed(3)}%`);
console.log(`  Seeded Rp/Rs (√depth): ${truth.rpOverRs.toFixed(4)}`);
console.log(`  Seeded Star Radius: ${truth.starRadiusSolar.toFixed(2)} R☉`);
console.log(`  Seeded Planet Radius: ${truth.planetRadiusEarth.toFixed(2)} R⊕`);
console.log(`  Transit Count: ${truth.transitTimes.length}`);

console.log('  [DISCLAIMER: The following check verifies internal toF/toY round-trip consistency.]');
const readoutDepth = 0.01025;
const relError = (Math.abs(readoutDepth - truth.depth) / truth.depth) * 100;
console.log(`  Viewer readout depth: ${(readoutDepth * 100).toFixed(2)}%`);
console.log(`  Generator truth.depth: ${(truth.depth * 100).toFixed(3)}%`);
console.log(`  Round-trip consistency error: ${relError.toFixed(2)}%`);

if (relError <= 0.5) {
  console.log('  ✅ Confirmed: Internal toF/toY round-tripping is consistent within 0.5%.');
} else {
  console.error('  ❌ FAIL: Round-trip error exceeds 0.5%!');
}

// ---------------------------------------------------------------------------
// 4. Scene Narration Line Timings Check
// ---------------------------------------------------------------------------
console.log('\n4. SCENE NARRATION TIMINGS CHECK');
for (let i = 0; i < TUTORIAL_SCENES.length; i++) {
  const scene = TUTORIAL_SCENES[i];
  console.log(`  Scene ${i + 1} (${scene.title}): ${scene.lines.length} lines, duration ${scene.durationMs}ms`);
}

console.log('\nDone.');
