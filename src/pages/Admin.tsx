/**
 * Admin View — dumps all localStorage submissions as a table.
 * Flags whether each team fell for the misleading evidence.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isMisleadingCard } from '../lib/ew047';

interface Submission {
  team: { name: string; member1: string; member2: string; seed: number } | null;
  report: {
    verdict: string | null;
    depthPercent: string;
    rpOverRs: string;
    planetRadiusEarth: string;
    orbitalPeriod: string;
    sizeClass: string;
    confidence: number;
    nextAction: string;
  } | null;
  evidenceTrust: { cardIndex: number; label: string; trusted: boolean | null }[];
  scores: Record<number, { accuracy: number; dataAnalysis: number; reasoning: number; time: number; total: number }>;
  submittedAt: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    try {
      const data = JSON.parse(
        localStorage.getItem('exoplanet-watch-submissions') || '[]'
      );
      setSubmissions(data);
    } catch {
      setSubmissions([]);
    }
  }, []);

  const clearAll = () => {
    if (window.confirm('Clear all submissions? This cannot be undone.')) {
      localStorage.removeItem('exoplanet-watch-submissions');
      setSubmissions([]);
    }
  };

  return (
    <div className="min-h-screen bg-void">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-bright">
              Admin — Submissions
            </h1>
            <p className="text-subtle text-sm">
              {submissions.length} submission
              {submissions.length !== 1 ? 's' : ''} in localStorage
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-surface border border-border rounded-lg text-text text-sm hover:border-accent transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={clearAll}
              className="px-4 py-2 bg-danger/20 border border-danger/30 rounded-lg text-danger text-sm hover:bg-danger/30 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="text-center py-16 text-muted">
            No submissions yet. Complete the game to see data here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 text-xs text-muted uppercase tracking-wider">
                    Team
                  </th>
                  <th className="text-left py-3 px-3 text-xs text-muted uppercase tracking-wider">
                    Verdict
                  </th>
                  <th className="text-center py-3 px-3 text-xs text-muted uppercase tracking-wider">
                    Fell for Misleading?
                  </th>
                  <th className="text-center py-3 px-3 text-xs text-muted uppercase tracking-wider">
                    R1 Score
                  </th>
                  <th className="text-center py-3 px-3 text-xs text-muted uppercase tracking-wider">
                    R2 Score
                  </th>
                  <th className="text-center py-3 px-3 text-xs text-muted uppercase tracking-wider">
                    R3 Score
                  </th>
                  <th className="text-center py-3 px-3 text-xs text-muted uppercase tracking-wider">
                    R4 Score
                  </th>
                  <th className="text-center py-3 px-3 text-xs text-muted uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="text-left py-3 px-3 text-xs text-muted uppercase tracking-wider">
                    Next Action
                  </th>
                  <th className="text-left py-3 px-3 text-xs text-muted uppercase tracking-wider">
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub, i) => {
                  const fellForMisleading = sub.evidenceTrust?.some(
                    (e) => isMisleadingCard(e.cardIndex) && e.trusted === true
                  );

                  return (
                    <tr
                      key={i}
                      className="border-b border-border/50 hover:bg-surface/30"
                    >
                      <td className="py-3 px-3">
                        <div className="text-text font-medium">
                          {sub.team?.name || '—'}
                        </div>
                        <div className="text-xs text-muted">
                          {sub.team?.member1}, {sub.team?.member2}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            sub.report?.verdict === 'FALSE_POSITIVE'
                              ? 'bg-success/20 text-success'
                              : sub.report?.verdict === 'CONFIRMED'
                              ? 'bg-danger/20 text-danger'
                              : 'bg-warning/20 text-warning'
                          }`}
                        >
                          {sub.report?.verdict || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {fellForMisleading ? (
                          <span className="text-danger font-bold">⚠ YES</span>
                        ) : (
                          <span className="text-success">✓ No</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-text">
                        {sub.scores?.[1]?.total ?? '—'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-text">
                        {sub.scores?.[2]?.total ?? '—'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-text">
                        {sub.scores?.[3]?.total ?? '—'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-text">
                        {sub.scores?.[4]?.total ?? '—'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-accent">
                        {sub.report?.confidence ?? '—'}%
                      </td>
                      <td className="py-3 px-3 text-subtle text-xs">
                        {sub.report?.nextAction || '—'}
                      </td>
                      <td className="py-3 px-3 text-muted text-xs">
                        {sub.submittedAt
                          ? new Date(sub.submittedAt).toLocaleString()
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
