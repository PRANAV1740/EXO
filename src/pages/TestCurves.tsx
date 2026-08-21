/**
 * Test Curves page — renders one of each curve type for visual QA.
 * Accessible at /test-curves.
 *
 * This is the first checkpoint: if these curves don't visually read as
 * their intended type, nothing downstream works.
 */

import { useState, useMemo } from 'react';
import {
  generateCurve,
  type CurveType,
  type Difficulty,
  type GeneratedCurve,
} from '../lib/lightcurve';
import { MiniCurveRenderer } from '../components/MiniCurveRenderer';
import { LightCurveViewer } from '../components/LightCurveViewer';

const CURVE_TYPES: { type: CurveType; label: string; description: string; marginal?: boolean }[] = [
  {
    type: 'planet',
    label: 'Planet Transit',
    description: 'Shallow dip (0.1–3%), flat bottom, repeats on a strict period',
  },
  {
    type: 'planet',
    label: 'Marginal Planet',
    description: 'Very shallow transit, barely visible above noise — tests detection limits',
    marginal: true,
  },
  {
    type: 'eclipsingBinary',
    label: 'Eclipsing Binary',
    description: 'Deep V-shaped dips (5–30%), alternating depth on odd/even transits',
  },
  {
    type: 'stellarVariability',
    label: 'Stellar Variability',
    description: 'Smooth wandering brightness from sine waves, no sharp dips',
  },
  {
    type: 'instrumentNoise',
    label: 'Instrument Noise',
    description: 'Random Gaussian scatter with isolated spikes, nothing repeats',
  },
  {
    type: 'insufficientData',
    label: 'Insufficient Data',
    description: 'Single planet-like dip, observation truncated before a second transit',
  },
];

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export default function TestCurves() {
  const [seed, setSeed] = useState(42);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  const curves = useMemo(() => {
    return CURVE_TYPES.map((ct, idx) => ({
      ...ct,
      curve: generateCurve(ct.type, seed + idx * 100, difficulty, ct.marginal),
    }));
  }, [seed, difficulty]);

  return (
    <div className="min-h-screen bg-void p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-bright mb-2">
            🔭 Light Curve Generator — Visual QA
          </h1>
          <p className="text-subtle text-sm">
            Each curve type must be visually distinguishable. If any curve
            doesn't read as its intended type, the generator needs fixing.
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-6 mb-8 p-4 bg-panel rounded-lg border border-border">
          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-1">
              Seed
            </label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              className="bg-surface border border-border rounded px-3 py-1.5 text-text w-28 text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-1">
              Difficulty
            </label>
            <div className="flex gap-1">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    difficulty === d
                      ? 'bg-accent text-white'
                      : 'bg-surface text-subtle hover:text-text border border-border'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Curves */}
        <div className="space-y-6">
          {curves.map((ct, idx) => (
            <CurveCard key={idx} {...ct} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CurveCard({
  label,
  description,
  curve,
}: {
  label: string;
  description: string;
  curve: GeneratedCurve;
}) {
  const { truth } = curve;
  const [interactive, setInteractive] = useState(false);

  return (
    <div className="bg-panel rounded-lg border border-border p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h2 className="text-lg font-semibold text-bright">{label}</h2>
          <p className="text-subtle text-sm">{description}</p>
        </div>
        <div className="text-right text-xs font-mono text-muted space-y-0.5">
          <div>
            Answer: <span className="text-accent">{truth.correctAnswer}</span>
          </div>
          {truth.depth > 0 && (
            <div>Depth: {(truth.depth * 100).toFixed(3)}%</div>
          )}
          {truth.period > 0 && <div>Period: {truth.period.toFixed(2)}d</div>}
          {truth.duration > 0 && (
            <div>Duration: {truth.duration.toFixed(2)}h</div>
          )}
          {truth.transitTimes.length > 0 && (
            <div>Transits: {truth.transitTimes.length}</div>
          )}
          {truth.oddDepth !== undefined && (
            <>
              <div>Odd depth: {(truth.oddDepth * 100).toFixed(2)}%</div>
              <div>Even depth: {(truth.evenDepth! * 100).toFixed(2)}%</div>
            </>
          )}
          <div>Noise σ: {truth.noiseSigma.toFixed(5)}</div>
          <div>
            Star: {truth.starRadiusSolar.toFixed(2)} R☉,{' '}
            {truth.starTempK.toFixed(0)} K
          </div>
          {truth.rpOverRs > 0 && (
            <>
              <div>Rp/Rs: {truth.rpOverRs.toFixed(4)}</div>
              <div>
                Planet: {truth.planetRadiusEarth.toFixed(2)} R⊕ ({truth.sizeClass})
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setInteractive(false)}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            !interactive
              ? 'bg-accent text-white'
              : 'bg-surface text-subtle border border-border hover:text-text'
          }`}
        >
          Static
        </button>
        <button
          onClick={() => setInteractive(true)}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            interactive
              ? 'bg-accent text-white'
              : 'bg-surface text-subtle border border-border hover:text-text'
          }`}
        >
          Interactive
        </button>
      </div>

      {interactive ? (
        <LightCurveViewer
          points={curve.points}
          width={900}
          height={300}
          initialViewWindowDays={6.0}
        />
      ) : (
        <MiniCurveRenderer
          points={curve.points}
          width={900}
          height={260}
          title={label}
        />
      )}
    </div>
  );
}

