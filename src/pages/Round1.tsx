/**
 * Round 1 — Detection (20–25 min)
 *
 * 8 curves sequentially:
 * - 2 clear planets
 * - 2 instrument noise at different sigmas
 * - 1 stellar variability
 * - 1 eclipsing binary
 * - 1 insufficient data
 * - 1 marginal planet
 *
 * Player marks dips, classifies TRANSIT / NO TRANSIT / UNCERTAIN,
 * writes one line of reasoning.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame, type Round1CurveSubmission } from '../lib/gameState';
import { generateCurve, type CurveType } from '../lib/lightcurve';
import { LightCurveViewer, type ViewerState } from '../components/LightCurveViewer';
import { scoreRound1 } from '../lib/scoring';

// Curve template for Round 1
interface CurveTemplate {
  type: CurveType;
  seedOffset: number;
  difficulty: 'easy' | 'medium' | 'hard';
  marginal?: boolean;
  label: string;
}

const ROUND1_TEMPLATES: CurveTemplate[] = [
  { type: 'planet', seedOffset: 100, difficulty: 'easy', label: 'Observation A' },
  { type: 'instrumentNoise', seedOffset: 200, difficulty: 'easy', label: 'Observation B' },
  { type: 'planet', seedOffset: 300, difficulty: 'medium', label: 'Observation C' },
  { type: 'stellarVariability', seedOffset: 400, difficulty: 'easy', label: 'Observation D' },
  { type: 'eclipsingBinary', seedOffset: 500, difficulty: 'medium', label: 'Observation E' },
  { type: 'instrumentNoise', seedOffset: 600, difficulty: 'medium', label: 'Observation F' },
  { type: 'insufficientData', seedOffset: 700, difficulty: 'easy', label: 'Observation G' },
  { type: 'planet', seedOffset: 800, difficulty: 'medium', marginal: true, label: 'Observation H' },
];

export default function Round1() {
  const navigate = useNavigate();
  const { state, dispatch, getElapsedMs } = useGame();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submissions, setSubmissions] = useState<Round1CurveSubmission[]>(() => {
    return state.round1Submissions.length > 0
      ? state.round1Submissions
      : ROUND1_TEMPLATES.map((_, i) => ({
          curveIndex: i,
          classification: null,
          reasoning: '',
          dipMarkers: [],
        }));
  });

  const teamSeed = state.team?.seed ?? 42;

  // Generate all curves (deterministic from seed)
  const curves = useMemo(() => {
    return ROUND1_TEMPLATES.map((tmpl) =>
      generateCurve(tmpl.type, teamSeed + tmpl.seedOffset, tmpl.difficulty, tmpl.marginal)
    );
  }, [teamSeed]);

  // Start timer on mount
  useEffect(() => {
    dispatch({ type: 'SET_ROUND', round: 1 });
    if (!state.roundTimers[1].isRunning && !state.completedRounds.includes(1)) {
      dispatch({ type: 'START_TIMER', round: 1 });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save submissions to game state
  useEffect(() => {
    dispatch({ type: 'SET_ROUND1_SUBMISSIONS', submissions });
  }, [submissions, dispatch]);

  const currentCurve = curves[currentIndex];
  const currentSubmission = submissions[currentIndex];
  const template = ROUND1_TEMPLATES[currentIndex];

  const handleViewerStateChange = useCallback(
    (viewerState: ViewerState) => {
      setSubmissions((prev) => {
        const next = [...prev];
        next[currentIndex] = {
          ...next[currentIndex],
          dipMarkers: viewerState.dipMarkers,
        };
        return next;
      });
    },
    [currentIndex]
  );

  const handleClassificationChange = (
    classification: 'TRANSIT' | 'NO TRANSIT' | 'UNCERTAIN'
  ) => {
    setSubmissions((prev) => {
      const next = [...prev];
      next[currentIndex] = { ...next[currentIndex], classification };
      return next;
    });
  };

  const handleReasoningChange = (reasoning: string) => {
    if (reasoning.length > 150) return;
    setSubmissions((prev) => {
      const next = [...prev];
      next[currentIndex] = { ...next[currentIndex], reasoning };
      return next;
    });
  };

  const handleSubmitRound = () => {
    // Stop timer
    dispatch({ type: 'STOP_TIMER', round: 1 });

    // Score
    const truths = curves.map((c) => c.truth);
    const elapsed = getElapsedMs(1);
    const score = scoreRound1(submissions, truths, elapsed);

    dispatch({ type: 'SET_SCORE', round: 1, score });
    dispatch({ type: 'COMPLETE_ROUND', round: 1 });

    // Navigate to transition
    navigate('/transition/2');
  };

  const allAnswered = submissions.every((s) => s.classification !== null);

  return (
    <div className="min-h-screen bg-void">
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Round header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-bright">
              Round 1 — Detection
            </h1>
            <p className="text-subtle text-sm">
              Examine each light curve. Mark any dips you find and classify
              whether a transit is present.
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">
              Curve {currentIndex + 1} of {ROUND1_TEMPLATES.length}
            </div>
            <div className="font-mono text-sm text-text">
              {template.label}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-surface rounded-full mb-6">
          <div
            className="h-full bg-accent rounded-full transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / ROUND1_TEMPLATES.length) * 100}%`,
            }}
          />
        </div>

        {/* Light curve viewer */}
        <div className="bg-panel rounded-lg border border-border p-4 mb-4">
          <LightCurveViewer
            key={currentIndex} // force remount on curve change
            points={currentCurve.points}
            width={880}
            height={340}
            initialViewWindowDays={9.0}
            enableDipMarkers={true}
            enableVerticalMarkers={false}
            enableHorizontalLines={false}
            onStateChange={handleViewerStateChange}
            initialState={{
              dipMarkers: currentSubmission.dipMarkers,
              verticalMarkers: { start: null, end: null },
              horizontalLines: { baseline: null, transitLevel: null },
            }}
          />
        </div>

        {/* Classification */}
        <div className="bg-panel rounded-lg border border-border p-5 mb-4">
          <div className="flex items-center gap-6 mb-4">
            <span className="text-sm text-subtle font-medium">
              Classification:
            </span>
            {(['TRANSIT', 'NO TRANSIT', 'UNCERTAIN'] as const).map((opt) => (
              <label
                key={opt}
                className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border transition-colors ${
                  currentSubmission.classification === opt
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-subtle hover:border-muted'
                }`}
              >
                <input
                  type="radio"
                  name={`classification-${currentIndex}`}
                  checked={currentSubmission.classification === opt}
                  onChange={() => handleClassificationChange(opt)}
                  className="sr-only"
                />
                <span className="text-sm font-medium">{opt}</span>
              </label>
            ))}
          </div>

          {/* Reasoning */}
          <div>
            <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">
              Reasoning (max 150 characters)
            </label>
            <div className="relative">
              <input
                type="text"
                value={currentSubmission.reasoning}
                onChange={(e) => handleReasoningChange(e.target.value)}
                placeholder="What did you observe? What drove your classification?"
                maxLength={150}
                className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted/40 text-sm focus:outline-none focus:border-accent transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                {currentSubmission.reasoning.length}/150
              </span>
            </div>
          </div>

          {/* Dip markers summary */}
          {currentSubmission.dipMarkers.length > 0 && (
            <div className="mt-3 text-xs text-transit-mark">
              {currentSubmission.dipMarkers.length} dip marker
              {currentSubmission.dipMarkers.length !== 1 ? 's' : ''} placed
              {' — '}
              {currentSubmission.dipMarkers
                .map((m) => `${m.t.toFixed(2)}d`)
                .join(', ')}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="px-4 py-2 bg-surface border border-border rounded-lg text-text text-sm hover:border-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          <div className="flex items-center gap-2">
            {ROUND1_TEMPLATES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                  i === currentIndex
                    ? 'bg-accent text-white'
                    : submissions[i].classification
                    ? 'bg-surface text-text border border-accent/50'
                    : 'bg-surface text-muted border border-border'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {currentIndex < ROUND1_TEMPLATES.length - 1 ? (
            <button
              onClick={() =>
                setCurrentIndex((i) =>
                  Math.min(ROUND1_TEMPLATES.length - 1, i + 1)
                )
              }
              className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-glow transition-colors"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmitRound}
              disabled={!allAnswered}
              className="px-6 py-2 bg-success text-white rounded-lg text-sm font-semibold hover:bg-success/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Submit Round 1
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
