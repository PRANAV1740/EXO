/**
 * Quick programmatic validation of light curve generator output.
 * Checks that each curve type has the expected statistical properties.
 */

import { generateCurve, type CurveType } from '../lib/lightcurve';

function validateCurve(type: CurveType, seed: number, marginal = false) {
  const curve = generateCurve(type, seed, 'medium', marginal);
  const { points, truth } = curve;

  const fluxes = points.map(p => p.flux);
  const minFlux = Math.min(...fluxes);
  const maxFlux = Math.max(...fluxes);
  const meanFlux = fluxes.reduce((a, b) => a + b, 0) / fluxes.length;
  const range = maxFlux - minFlux;

  console.log(`\n=== ${type}${marginal ? ' (marginal)' : ''} ===`);
  console.log(`  Points: ${points.length}`);
  console.log(`  Time span: ${points[0].t.toFixed(2)} - ${points[points.length - 1].t.toFixed(2)} days`);
  console.log(`  Flux: min=${minFlux.toFixed(6)}, max=${maxFlux.toFixed(6)}, mean=${meanFlux.toFixed(6)}`);
  console.log(`  Flux range: ${range.toFixed(6)}`);
  console.log(`  correctAnswer: ${truth.correctAnswer}`);
  console.log(`  partialAnswers: ${JSON.stringify(truth.partialAnswers || 'none')}`);

  // Type-specific checks
  switch (type) {
    case 'planet': {
      console.log(`  Depth: ${(truth.depth * 100).toFixed(3)}%`);
      console.log(`  Period: ${truth.period.toFixed(3)}d`);
      console.log(`  Duration: ${truth.duration.toFixed(2)}h`);
      console.log(`  Transits: ${truth.transitTimes.length}`);
      console.log(`  Rp/Rs: ${truth.rpOverRs.toFixed(4)}`);
      console.log(`  Planet radius: ${truth.planetRadiusEarth.toFixed(2)} R⊕ (${truth.sizeClass})`);
      console.log(`  Noise σ: ${truth.noiseSigma.toFixed(6)}`);
      console.log(`  SNR (depth/σ): ${(truth.depth / truth.noiseSigma).toFixed(1)}`);

      // The minimum flux should be noticeably below 1.0
      const expectedDip = 1.0 - truth.depth;
      const actualDipApprox = minFlux;
      console.log(`  Expected dip to ~${expectedDip.toFixed(4)}, actual min ~${actualDipApprox.toFixed(4)}`);

      if (truth.transitTimes.length < 2 && !marginal) {
        console.error('  ❌ FAIL: Planet should have multiple transits');
      } else {
        console.log('  ✅ Transit count OK');
      }
      if (truth.depth < 0.001 || truth.depth > 0.03) {
        console.error(`  ❌ FAIL: Depth ${truth.depth} out of range [0.001, 0.03]`);
      } else {
        console.log('  ✅ Depth in range');
      }
      break;
    }
    case 'eclipsingBinary': {
      console.log(`  Avg depth: ${(truth.depth * 100).toFixed(2)}%`);
      console.log(`  Odd depth: ${(truth.oddDepth! * 100).toFixed(2)}%`);
      console.log(`  Even depth: ${(truth.evenDepth! * 100).toFixed(2)}%`);
      console.log(`  Odd/even ratio: ${(truth.oddDepth! / truth.evenDepth!).toFixed(3)}`);
      console.log(`  Period: ${truth.period.toFixed(3)}d`);
      console.log(`  Transits: ${truth.transitTimes.length}`);

      if (truth.oddDepth! / truth.evenDepth! < 1.10 || truth.oddDepth! / truth.evenDepth! > 1.20) {
        console.error('  ❌ FAIL: Odd/even ratio should be 1.10–1.20');
      } else {
        console.log('  ✅ Odd/even ratio in range');
      }
      if (truth.depth < 0.05 || truth.depth > 0.30) {
        console.error(`  ❌ FAIL: Depth ${truth.depth} out of range [0.05, 0.30]`);
      } else {
        console.log('  ✅ Depth in range');
      }
      break;
    }
    case 'stellarVariability': {
      console.log(`  Flux range: ${(range * 100).toFixed(2)}%`);
      console.log(`  No transits: ${truth.transitTimes.length === 0 ? '✅' : '❌'}`);
      break;
    }
    case 'instrumentNoise': {
      console.log(`  Noise σ: ${truth.noiseSigma.toFixed(6)}`);
      console.log(`  Range: ${(range * 100).toFixed(2)}% (includes spikes)`);
      console.log(`  No transits: ${truth.transitTimes.length === 0 ? '✅' : '❌'}`);
      break;
    }
    case 'insufficientData': {
      console.log(`  Single transit at: ${truth.epoch.toFixed(2)} days`);
      console.log(`  Transit count: ${truth.transitTimes.length}`);
      console.log(`  Observation span: ${points[points.length - 1].t.toFixed(2)} days`);
      console.log(`  Period (hidden): ${truth.period.toFixed(2)} days`);

      if (truth.transitTimes.length !== 1) {
        console.error('  ❌ FAIL: Should have exactly 1 transit');
      } else {
        console.log('  ✅ Single transit');
      }
      // Check observation is shorter than epoch + period
      const obsEnd = points[points.length - 1].t;
      if (obsEnd > truth.epoch + truth.period) {
        console.error('  ❌ FAIL: Observation too long — second transit might be visible');
      } else {
        console.log('  ✅ Observation truncated before second transit');
      }
      break;
    }
  }
}

// Determinism test
function testDeterminism() {
  console.log('\n=== DETERMINISM TEST ===');
  const a = generateCurve('planet', 42, 'easy');
  const b = generateCurve('planet', 42, 'easy');

  if (a.points.length !== b.points.length) {
    console.error('❌ FAIL: Different point counts');
    return;
  }

  let match = true;
  for (let i = 0; i < a.points.length; i++) {
    if (a.points[i].t !== b.points[i].t || a.points[i].flux !== b.points[i].flux) {
      console.error(`❌ FAIL: Point ${i} differs`);
      match = false;
      break;
    }
  }

  if (match) {
    console.log('✅ Same seed produces identical output');
  }

  // Different seed should produce different output
  const c = generateCurve('planet', 43, 'easy');
  if (c.points[0].flux === a.points[0].flux) {
    console.error('❌ FAIL: Different seeds produce same output');
  } else {
    console.log('✅ Different seeds produce different output');
  }
}

// Run all validations
console.log('Light Curve Generator Validation');
console.log('================================');

validateCurve('planet', 42);
validateCurve('planet', 42, true); // marginal
validateCurve('eclipsingBinary', 142);
validateCurve('stellarVariability', 242);
validateCurve('instrumentNoise', 342);
validateCurve('insufficientData', 442);

testDeterminism();

console.log('\n\nDone.');
