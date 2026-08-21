/**
 * RoundTransition — Transition screen between rounds.
 * Shows timer, progress bar, round summary, and a "Proceed" button.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useGame, ROUND_NAMES, type RoundNumber } from '../lib/gameState';
import { getPendingReasoningPercent } from '../lib/scoring';

export function RoundTransition() {
  const { nextRound } = useParams<{ nextRound: string }>();
  const navigate = useNavigate();
  const { state } = useGame();

  const nextRoundNum = (parseInt(nextRound || '2') as RoundNumber) || 2;
  const completedRoundNum = (nextRoundNum - 1) as RoundNumber;

  const score = state.scores[completedRoundNum];

  const handleProceed = () => {
    navigate(`/round/${nextRoundNum}`);
  };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-6">
      <div className="bg-panel border border-border rounded-xl p-8 max-w-lg w-full text-center space-y-6">
        {/* Header */}
        <div>
          <span className="text-xs text-accent font-semibold uppercase tracking-wider block mb-1">
            Round Complete!
          </span>
          <h1 className="text-2xl font-bold text-bright">
            Round {completedRoundNum}: {ROUND_NAMES[completedRoundNum]} Finished
          </h1>
        </div>

        {/* Score Summary */}
        {score ? (
          <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
            <div className="text-xs text-muted uppercase tracking-wider">
              Provisional Subtotal Score
            </div>
            <div className="text-4xl font-bold text-accent">
              {score.total} <span className="text-lg text-muted">/ 100</span>
            </div>
            <div className="text-xs text-warning">
              + {getPendingReasoningPercent(score)} weight pending judge review
            </div>
          </div>
        ) : (
          <div className="text-sm text-subtle">
            Round submissions saved successfully.
          </div>
        )}

        {/* Transition info */}
        <div className="space-y-2 text-sm text-subtle">
          <p>
            Next up: <strong className="text-bright">Round {nextRoundNum} — {ROUND_NAMES[nextRoundNum]}</strong>
          </p>
          <p className="text-xs text-muted">
            Take a breath, review your notes in the Handbook if needed, then click proceed when ready.
          </p>
        </div>

        {/* Action button */}
        <div>
          <button
            onClick={handleProceed}
            className="w-full py-3.5 bg-accent text-white font-semibold rounded-lg hover:bg-accent-glow transition-all text-base"
          >
            Proceed to Round {nextRoundNum} →
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoundTransition;
