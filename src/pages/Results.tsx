/**
 * Results — score breakdown by round and category.
 *
 * Shows two numbers per round: auto-scored subtotal + "X% pending judge review".
 * Never silently looks like a low score due to unscored reasoning.
 */

import { useNavigate } from 'react-router-dom';
import { useGame, ROUND_NAMES, type RoundNumber, type RoundScore } from '../lib/gameState';
import { ROUND_WEIGHTS, getPendingReasoningPercent, getCumulativeScore } from '../lib/scoring';

export default function Results() {
  const navigate = useNavigate();
  const { state, formatTimer, getElapsedMs } = useGame();

  const rounds = [1, 2, 3, 4] as RoundNumber[];
  const cumulative = getCumulativeScore(state.scores);

  return (
    <div className="min-h-screen bg-void">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-bright mb-2">
          Mission Results
        </h1>
        <p className="text-subtle text-sm mb-8">
          {state.team?.name
            ? `Team: ${state.team.name} • ${state.team.member1} & ${state.team.member2}`
            : 'No team registered'}
        </p>

        {/* Cumulative score */}
        <div className="bg-panel rounded-lg border border-accent/30 p-6 mb-8 text-center">
          <div className="text-xs text-muted uppercase tracking-wider mb-1">
            Cumulative Score (Auto-scored)
          </div>
          <div className="text-5xl font-bold text-accent mb-1">
            {cumulative}
            <span className="text-2xl text-muted">/100</span>
          </div>
          <div className="text-xs text-warning">
            Reasoning components pending judge review
          </div>
        </div>

        {/* Round breakdown */}
        <div className="space-y-4">
          {rounds.map((round) => {
            const score = state.scores[round];
            const completed = state.completedRounds.includes(round);
            const elapsed = getElapsedMs(round);

            return (
              <div
                key={round}
                className={`bg-panel rounded-lg border p-5 ${
                  completed ? 'border-border' : 'border-border/50 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-bright">
                    Round {round}: {ROUND_NAMES[round]}
                  </h2>
                  <div className="flex items-center gap-4">
                    {completed && (
                      <span className="text-xs font-mono text-muted">
                        Time: {formatTimer(elapsed)}
                      </span>
                    )}
                    {score && (
                      <span className="text-lg font-bold text-accent">
                        {score.total}/100
                      </span>
                    )}
                    {!completed && (
                      <span className="text-xs text-muted">Not completed</span>
                    )}
                  </div>
                </div>

                {score && <ScoreBreakdown score={score} round={round} />}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-8 flex gap-4 justify-center">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-surface border border-border rounded-lg text-text text-sm hover:border-accent transition-colors"
          >
            Back to Home
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="px-6 py-2 bg-surface border border-border rounded-lg text-subtle text-sm hover:border-accent transition-colors"
          >
            Admin View
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreBreakdown({
  score,
  round,
}: {
  score: RoundScore;
  round: RoundNumber;
}) {
  const weight = ROUND_WEIGHTS[round];
  const categories = [
    {
      label: 'Accuracy',
      value: score.accuracy,
      weight: weight.accuracy,
      color: 'text-accent',
    },
    {
      label: 'Data Analysis',
      value: score.dataAnalysis,
      weight: weight.dataAnalysis,
      color: 'text-baseline',
    },
    {
      label: 'Reasoning',
      value: score.reasoning,
      weight: weight.reasoning,
      color: 'text-warning',
      isPending: true,
    },
    {
      label: 'Time',
      value: score.time,
      weight: weight.time,
      color: 'text-violet-400',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {categories.map((cat) => (
        <div key={cat.label} className="bg-surface rounded-lg p-3">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1">
            {cat.label}{' '}
            <span className="text-muted/60">
              ({Math.round(cat.weight * 100)}%)
            </span>
          </div>
          {cat.isPending ? (
            <div className="text-sm text-warning">
              Pending Review
              <div className="text-[10px] text-muted mt-0.5">
                {getPendingReasoningPercent(score)} of total
              </div>
            </div>
          ) : (
            <div className={`text-lg font-bold ${cat.color}`}>
              {cat.value}
              <span className="text-xs text-muted font-normal">/100</span>
            </div>
          )}
          {/* Score bar */}
          {!cat.isPending && (
            <div className="w-full h-1 bg-deep rounded-full mt-2">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${cat.value}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
