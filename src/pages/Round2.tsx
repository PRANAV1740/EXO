/**
 * Round 2 — Validation (60–75 min)
 *
 * 5 cases, one per type, harder noise (difficulty: 'hard').
 * Player classifies: PLANET CANDIDATE / FALSE POSITIVE / INSUFFICIENT DATA
 * Clicks driving feature, writes reasoning.
 * If INSUFFICIENT DATA selected, must specify what observation is missing.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame, type Round2CaseSubmission } from '../lib/gameState';
import { generateCurve, type CurveType } from '../lib/lightcurve';
import { LightCurveViewer, type ViewerState } from '../components/LightCurveViewer';
import { scoreRound2 } from '../lib/scoring';

interface CaseTemplate {
  type: CurveType;
  seedOffset: number;
  label: string;
}

const ROUND2_TEMPLATES: CaseTemplate[] = [
  { type: 'planet', seedOffset: 1100, label: 'Target Alpha' },
  { type: 'eclipsingBinary', seedOffset: 1200, label: 'Target Beta' },
  { type: 'stellarVariability', seedOffset: 1300, label: 'Target Gamma' },
  { type: 'instrumentNoise', seedOffset: 1400, label: 'Target Delta' },
  { type: 'insufficientData', seedOffset: 1500, label: 'Target Epsilon' },
];

type Classification = 'PLANET CANDIDATE' | 'FALSE POSITIVE' | 'INSUFFICIENT DATA';

export default function Round2() {
  const navigate = useNavigate();
  const { state, dispatch, getElapsedMs } = useGame();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submissions, setSubmissions] = useState<Round2CaseSubmission[]>(() => {
    return state.round2Submissions.length > 0
      ? state.round2Submissions
      : ROUND2_TEMPLATES.map((_, i) => ({
          caseIndex: i,
          classification: null,
          reasoning: '',
          featureMarkers: [],
          missingObservation: undefined,
        }));
  });

  const teamSeed = state.team?.seed ?? 42;

  const curves = useMemo(() => {
    return ROUND2_TEMPLATES.map((tmpl) =>
      generateCurve(tmpl.type, teamSeed + tmpl.seedOffset, 'hard')
    );
  }, [teamSeed]);

  useEffect(() => {
    dispatch({ type: 'SET_ROUND', round: 2 });
    if (!state.roundTimers[2].isRunning && !state.completedRounds.includes(2)) {
      dispatch({ type: 'START_TIMER', round: 2 });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    dispatch({ type: 'SET_ROUND2_SUBMISSIONS', submissions });
  }, [submissions, dispatch]);

  const currentCurve = curves[currentIndex];
  const currentSubmission = submissions[currentIndex];
  const template = ROUND2_TEMPLATES[currentIndex];

  const handleViewerStateChange = useCallback(
    (viewerState: ViewerState) => {
      setSubmissions((prev) => {
        const next = [...prev];
        next[currentIndex] = {
          ...next[currentIndex],
          featureMarkers: viewerState.dipMarkers,
        };
        return next;
      });
    },
    [currentIndex]
  );

  const handleClassificationChange = (classification: Classification) => {
    setSubmissions((prev) => {
      const next = [...prev];
      next[currentIndex] = {
        ...next[currentIndex],
        classification,
        missingObservation:
          classification === 'INSUFFICIENT DATA'
            ? next[currentIndex].missingObservation || ''
            : undefined,
      };
      return next;
    });
  };

  const handleReasoningChange = (reasoning: string) => {
    if (reasoning.length > 300) return;
    setSubmissions((prev) => {
      const next = [...prev];
      next[currentIndex] = { ...next[currentIndex], reasoning };
      return next;
    });
  };

  const handleMissingObservationChange = (text: string) => {
    if (text.length > 200) return;
    setSubmissions((prev) => {
      const next = [...prev];
      next[currentIndex] = { ...next[currentIndex], missingObservation: text };
      return next;
    });
  };

  const handleSubmitRound = () => {
    dispatch({ type: 'STOP_TIMER', round: 2 });
    const truths = curves.map((c) => c.truth);
    const elapsed = getElapsedMs(2);
    const score = scoreRound2(submissions, truths, elapsed);
    dispatch({ type: 'SET_SCORE', round: 2, score });
    dispatch({ type: 'COMPLETE_ROUND', round: 2 });
    navigate('/transition/3');
  };

  const allAnswered = submissions.every(
    (s) =>
      s.classification !== null &&
      s.featureMarkers.length > 0 &&
      (s.classification !== 'INSUFFICIENT DATA' ||
        (s.missingObservation && s.missingObservation.trim().length > 0))
  );

  return (
    <div className="min-h-screen bg-void">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-bright">
              Round 2 — Validation
            </h1>
            <p className="text-subtle text-sm">
              Each case is harder. Click the specific feature that drives your
              decision, then classify and explain.
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">
              Case {currentIndex + 1} of {ROUND2_TEMPLATES.length}
            </div>
            <div className="font-mono text-sm text-text">{template.label}</div>
          </div>
        </div>

        {/* Progress */}
        <div className="w-full h-1 bg-surface rounded-full mb-6">
          <div
            className="h-full bg-accent rounded-full transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / ROUND2_TEMPLATES.length) * 100}%`,
            }}
          />
        </div>

        {/* Viewer */}
        <div className="bg-panel rounded-lg border border-border p-4 mb-4">
          <div className="text-xs text-warning mb-2">
            ⚠ Click on the specific feature that drives your classification
          </div>
          <LightCurveViewer
            key={`r2-${currentIndex}`}
            points={currentCurve.points}
            width={880}
            height={340}
            initialViewWindowDays={9.0}
            enableDipMarkers={true}
            enableVerticalMarkers={true}
            enableHorizontalLines={true}
            onStateChange={handleViewerStateChange}
            initialState={{
              dipMarkers: currentSubmission.featureMarkers,
              verticalMarkers: { start: null, end: null },
              horizontalLines: { baseline: null, transitLevel: null },
            }}
          />
        </div>

        {/* Classification */}
        <div className="bg-panel rounded-lg border border-border p-5 mb-4 space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-subtle font-medium">
              Classification:
            </span>
            {(
              [
                'PLANET CANDIDATE',
                'FALSE POSITIVE',
                'INSUFFICIENT DATA',
              ] as Classification[]
            ).map((opt) => (
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
                  name={`r2-classification-${currentIndex}`}
                  checked={currentSubmission.classification === opt}
                  onChange={() => handleClassificationChange(opt)}
                  className="sr-only"
                />
                <span className="text-sm font-medium">{opt}</span>
              </label>
            ))}
          </div>

          {/* Missing observation field (required for INSUFFICIENT DATA) */}
          {currentSubmission.classification === 'INSUFFICIENT DATA' && (
            <div className="bg-warning/5 border border-warning/30 rounded-lg p-4">
              <label className="block text-xs text-warning uppercase tracking-wider mb-1.5">
                What specific observation is missing? (Required)
              </label>
              <input
                type="text"
                value={currentSubmission.missingObservation || ''}
                onChange={(e) => handleMissingObservationChange(e.target.value)}
                placeholder="e.g. Need a second transit observation to confirm periodicity"
                maxLength={200}
                className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted/40 text-sm focus:outline-none focus:border-warning transition-colors"
              />
            </div>
          )}

          {/* Reasoning */}
          <div>
            <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">
              Reasoning (max 300 characters)
            </label>
            <div className="relative">
              <textarea
                value={currentSubmission.reasoning}
                onChange={(e) => handleReasoningChange(e.target.value)}
                placeholder="Describe the key evidence for your classification..."
                maxLength={300}
                rows={3}
                className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted/40 text-sm focus:outline-none focus:border-accent transition-colors resize-none"
              />
              <span className="absolute right-3 bottom-2 text-xs text-muted">
                {currentSubmission.reasoning.length}/300
              </span>
            </div>
          </div>

          {currentSubmission.featureMarkers.length > 0 && (
            <div className="text-xs text-transit-mark">
              {currentSubmission.featureMarkers.length} feature marker
              {currentSubmission.featureMarkers.length !== 1 ? 's' : ''} placed
            </div>
          )}
          {currentSubmission.featureMarkers.length === 0 && currentSubmission.classification && (
            <div className="text-xs text-warning">
              ⚠ You must click at least one feature on the plot
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
            {ROUND2_TEMPLATES.map((_, i) => {
              const s = submissions[i];
              const complete =
                s.classification !== null &&
                s.featureMarkers.length > 0 &&
                (s.classification !== 'INSUFFICIENT DATA' ||
                  (s.missingObservation && s.missingObservation.trim().length > 0));
              return (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                    i === currentIndex
                      ? 'bg-accent text-white'
                      : complete
                      ? 'bg-surface text-text border border-accent/50'
                      : 'bg-surface text-muted border border-border'
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {currentIndex < ROUND2_TEMPLATES.length - 1 ? (
            <button
              onClick={() => setCurrentIndex((i) => Math.min(ROUND2_TEMPLATES.length - 1, i + 1))}
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
              Submit Round 2
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
