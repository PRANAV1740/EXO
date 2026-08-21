/**
 * Team Setup — team name + two member names.
 * Derives the seed from a hash of the team name.
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
    navigate('/how-to-play');
  };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
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
    </div>
  );
}
