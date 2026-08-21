/**
 * Team Setup — team name + two member names.
 * Derives the seed from a hash of the team name.
 * Offers tutorial walkthrough dialog upon completion if not yet completed.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../lib/gameState';
import { hashString } from '../lib/prng';

export default function TeamSetup() {
  const navigate = useNavigate();
  const { dispatch } = useGame();

  const [teamName, setTeamName] = useState('');
  const [member1, setMember1] = useState('');
  const [member2, setMember2] = useState('');
  const [showOfferDialog, setShowOfferDialog] = useState(false);

  const canSubmit = teamName.trim().length > 0 && member1.trim().length > 0 && member2.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const seed = hashString(teamName.trim());
    dispatch({
      type: 'SET_TEAM',
      team: {
        name: teamName.trim(),
        member1: member1.trim(),
        member2: member2.trim(),
        seed,
      },
    });

    // Check if tutorial flag is set
    const tutorialDone = localStorage.getItem('exoplanet-watch-tutorial-done') === 'true';
    if (!tutorialDone) {
      setShowOfferDialog(true);
    } else {
      navigate('/how-to-play');
    }
  };

  const handleWatchTutorial = () => {
    localStorage.setItem('exoplanet-watch-tutorial-done', 'true');
    navigate('/tutorial');
  };

  const handleSkipTutorial = () => {
    localStorage.setItem('exoplanet-watch-tutorial-done', 'true');
    navigate('/how-to-play');
  };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center relative">
      <div className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-bright mb-2 text-center">
          Team Registration
        </h1>
        <p className="text-subtle text-sm text-center mb-8">
          Your team name determines which data you'll analyze — every team
          gets unique observations from the same difficulty template.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">
              Team Name
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Kepler's Crew"
              maxLength={40}
              className="w-full bg-panel border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">
                Member 1
              </label>
              <input
                type="text"
                value={member1}
                onChange={(e) => setMember1(e.target.value)}
                placeholder="Name"
                maxLength={30}
                className="w-full bg-panel border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">
                Member 2
              </label>
              <input
                type="text"
                value={member2}
                onChange={(e) => setMember2(e.target.value)}
                placeholder="Name"
                maxLength={30}
                className="w-full bg-panel border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          {teamName.trim() && (
            <p className="text-xs text-muted text-center">
              Seed: <span className="font-mono text-subtle">{hashString(teamName.trim())}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent-glow transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Start Mission →
          </button>
        </form>
      </div>

      {/* Tutorial Offer Dialog Modal */}
      {showOfferDialog && (
        <div className="fixed inset-0 z-50 bg-void/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-panel border border-border rounded-xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-accent/20 border border-accent/40 text-accent text-2xl flex items-center justify-center mx-auto">
              🔭
            </div>
            <h2 className="text-lg font-bold text-bright">
              New to Light Curves?
            </h2>
            <p className="text-xs text-subtle leading-relaxed">
              We recommend taking the <strong className="text-text">4-minute animated walkthrough</strong> before starting Round 1. It demonstrates how to detect planets, read graphs, and use the plot tools.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleWatchTutorial}
                className="flex-1 py-2.5 bg-accent text-white rounded-lg font-semibold text-xs hover:bg-accent-glow transition-colors"
              >
                Watch Walkthrough 🎬
              </button>
              <button
                onClick={handleSkipTutorial}
                className="flex-1 py-2.5 bg-surface border border-border text-subtle rounded-lg font-medium text-xs hover:text-text hover:border-accent transition-colors"
              >
                Skip to Mission →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
