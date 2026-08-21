/**
 * Persistent header — shown throughout the game.
 * Shows: team name, current round, countdown/overtime timer, Handbook button.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGame, ROUND_TIME_LIMITS, ROUND_NAMES } from '../lib/gameState';

export function Header() {
  const { state, getElapsedMs, formatTimer } = useGame();
  const navigate = useNavigate();
  const location = useLocation();
  const [, setTick] = useState(0);

  // Tick every second for timer display
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const { team, currentRound } = state;
  const elapsed = currentRound ? getElapsedMs(currentRound) : 0;
  const timeLimit = currentRound ? ROUND_TIME_LIMITS[currentRound] : 0;
  const isOvertime = elapsed > timeLimit;

  // Don't show header on landing page
  if (location.pathname === '/') return null;

  return (
    <header className="sticky top-0 z-50 bg-deep/95 backdrop-blur border-b border-border px-6 py-2.5 flex items-center justify-between">
      {/* Left: Logo & team */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="text-accent font-bold text-sm tracking-widest hover:text-accent-glow transition-colors"
        >
          EXOPLANET WATCH
        </button>
        {team && (
          <span className="text-xs text-muted border-l border-border pl-4">
            Team: <span className="text-text font-medium">{team.name}</span>
          </span>
        )}
      </div>

      {/* Center: Round info & timer */}
      <div className="flex items-center gap-4">
        {currentRound && (
          <>
            <span className="text-xs text-subtle">
              Round {currentRound}:{' '}
              <span className="text-text font-medium">
                {ROUND_NAMES[currentRound]}
              </span>
            </span>
            <div
              className={`font-mono text-sm px-3 py-1 rounded ${
                isOvertime
                  ? 'bg-danger/20 text-danger'
                  : 'bg-surface text-text'
              }`}
            >
              {isOvertime && (
                <span className="text-[10px] uppercase tracking-wider mr-1.5 opacity-75">
                  overtime
                </span>
              )}
              {formatTimer(elapsed)}
              <span className="text-muted text-xs ml-1">
                / {formatTimer(timeLimit)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Right: Handbook & nav */}
      <div className="flex items-center gap-3">
        {currentRound && (
          <button
            onClick={() => navigate('/handbook')}
            className="px-3 py-1.5 text-xs bg-surface border border-border rounded hover:border-accent hover:text-accent transition-colors"
          >
            📖 Handbook
          </button>
        )}
        {state.completedRounds.length > 0 && (
          <button
            onClick={() => navigate('/results')}
            className="px-3 py-1.5 text-xs bg-surface border border-border rounded hover:border-accent hover:text-accent transition-colors"
          >
            Results
          </button>
        )}
      </div>
    </header>
  );
}
