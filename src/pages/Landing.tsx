/**
 * Landing page — event name, tagline, Start button.
 */

import { useNavigate } from 'react-router-dom';
import { useGame } from '../lib/gameState';

export default function Landing() {
  const navigate = useNavigate();
  const { state } = useGame();

  return (
    <div className="min-h-screen bg-void flex items-center justify-center relative overflow-hidden">
      {/* Starfield background */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 80 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: `${1 + (i % 3)}px`,
              height: `${1 + (i % 3)}px`,
              left: `${(i * 17.3) % 100}%`,
              top: `${(i * 23.7) % 100}%`,
              opacity: 0.1 + (i % 5) * 0.08,
              animation: `pulse ${2 + (i % 4)}s ease-in-out infinite`,
              animationDelay: `${(i % 7) * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div className="text-center z-10 px-8">
        {/* Title */}
        <div className="mb-2 text-accent text-sm tracking-[0.35em] uppercase font-medium">
          Online Astronomy Competition
        </div>
        <h1 className="text-6xl font-bold text-bright mb-4 tracking-tight">
          EXOPLANET
          <br />
          <span className="text-accent">WATCH</span>
        </h1>
        <p className="text-subtle text-lg mb-10 max-w-xl mx-auto leading-relaxed">
          Hunt for alien worlds hidden in starlight. Analyze light curves,
          detect transits, and confirm — or debunk — exoplanet candidates.
        </p>

        {/* CTA */}
        <div className="flex flex-col items-center gap-4">
          {state.team ? (
            <>
              <p className="text-muted text-sm">
                Welcome back, <span className="text-text">{state.team.name}</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (state.currentRound) {
                      navigate(`/round/${state.currentRound}`);
                    } else {
                      navigate('/how-to-play');
                    }
                  }}
                  className="px-8 py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent-glow transition-colors text-lg"
                >
                  Continue Mission →
                </button>
                <button
                  onClick={() => navigate('/results')}
                  className="px-6 py-3 bg-surface border border-border text-text rounded-lg hover:border-accent transition-colors"
                >
                  View Results
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => navigate('/setup')}
              className="px-10 py-3.5 bg-accent text-white font-semibold rounded-lg hover:bg-accent-glow transition-all text-lg hover:scale-105"
            >
              Begin Mission →
            </button>
          )}
        </div>

        {/* Footer links */}
        <div className="mt-12 flex gap-6 justify-center text-xs text-muted">
          <button
            onClick={() => navigate('/how-to-play')}
            className="hover:text-accent transition-colors"
          >
            How to Play
          </button>
          <button
            onClick={() => navigate('/handbook')}
            className="hover:text-accent transition-colors"
          >
            Mission Handbook
          </button>
          <button
            onClick={() => navigate('/test-curves')}
            className="hover:text-accent transition-colors opacity-50"
          >
            Dev: Test Curves
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
