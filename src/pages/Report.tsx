/**
 * Final Investigation Report — structured submission form.
 *
 * Hard cap of 400 words across all text inputs.
 * Not a free essay — structured fields.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame, type FinalReport } from '../lib/gameState';
import { EW047_EVIDENCE_CARDS } from '../lib/ew047';
import { scoreRound4 } from '../lib/scoring';

const WORD_LIMIT = 400;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const INITIAL_REPORT: FinalReport = {
  verdict: null,
  depthPercent: '',
  rpOverRs: '',
  planetRadiusEarth: '',
  orbitalPeriod: '',
  sizeClass: '',
  evidenceUsed: [],
  evidenceUsedText: '',
  evidenceRejected: [],
  evidenceRejectedText: '',
  nextAction: '',
  nextActionReason: '',
  confidence: 50,
  confidenceReason: '',
};

const NEXT_ACTIONS = [
  'More photometry',
  'Radial-velocity follow-up',
  'High-resolution imaging',
  'Drop the candidate',
];

export default function Report() {
  const navigate = useNavigate();
  const { state, dispatch, getElapsedMs } = useGame();
  const [report, setReport] = useState<FinalReport>(
    state.finalReport || INITIAL_REPORT
  );

  // Get trusted/rejected from evidence
  const trustedCards = state.evidenceTrust
    .filter((e) => e.trusted === true)
    .map((e) => e.cardIndex);
  const rejectedCards = state.evidenceTrust
    .filter((e) => e.trusted === false)
    .map((e) => e.cardIndex);

  useEffect(() => {
    setReport((prev) => ({
      ...prev,
      evidenceUsed: trustedCards,
      evidenceRejected: rejectedCards,
    }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Total word count across all text fields
  const totalWords = useMemo(() => {
    return (
      countWords(report.evidenceUsedText) +
      countWords(report.evidenceRejectedText) +
      countWords(report.nextActionReason) +
      countWords(report.confidenceReason)
    );
  }, [report]);

  const wordsRemaining = WORD_LIMIT - totalWords;

  const canSubmit =
    report.verdict !== null &&
    report.nextAction !== '' &&
    totalWords <= WORD_LIMIT;

  const handleSubmit = () => {
    // Stop timer
    dispatch({ type: 'STOP_TIMER', round: 4 });
    dispatch({ type: 'SET_FINAL_REPORT', report });

    // Score Round 4
    // The misleading evidence card is index 6
    const fellForMisleading = state.evidenceTrust.some(
      (e) => e.cardIndex === 6 && e.trusted === true
    );
    const correctVerdict = report.verdict === 'FALSE_POSITIVE';
    const elapsed = getElapsedMs(4);
    const score = scoreRound4(fellForMisleading, correctVerdict, elapsed);

    dispatch({ type: 'SET_SCORE', round: 4, score });
    dispatch({ type: 'COMPLETE_ROUND', round: 4 });

    // Save full submission to localStorage
    const submission = {
      team: state.team,
      report,
      evidenceTrust: state.evidenceTrust,
      scores: { ...state.scores, 4: score },
      submittedAt: new Date().toISOString(),
    };
    const allSubmissions = JSON.parse(
      localStorage.getItem('exoplanet-watch-submissions') || '[]'
    );
    allSubmissions.push(submission);
    localStorage.setItem(
      'exoplanet-watch-submissions',
      JSON.stringify(allSubmissions)
    );

    navigate('/results');
  };

  const update = (field: keyof FinalReport, value: unknown) => {
    setReport((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-void">
      <div className="max-w-3xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-bright">
            Final Investigation Report — EW-047
          </h1>
          <p className="text-subtle text-sm">
            Present your findings. Structured fields, not a free essay.
          </p>
        </div>

        {/* Word counter */}
        <div
          className={`mb-6 p-3 rounded-lg border text-sm font-mono text-center ${
            wordsRemaining < 0
              ? 'bg-danger/10 border-danger text-danger'
              : wordsRemaining < 50
              ? 'bg-warning/10 border-warning text-warning'
              : 'bg-surface border-border text-muted'
          }`}
        >
          {totalWords} / {WORD_LIMIT} words used
          {wordsRemaining < 0 && ' — over limit!'}
        </div>

        <div className="space-y-6">
          {/* 1. Verdict */}
          <section className="bg-panel rounded-lg border border-border p-5">
            <h2 className="text-sm font-semibold text-bright mb-3">
              1. Verdict
            </h2>
            <div className="flex gap-3">
              {(
                [
                  ['CONFIRMED', 'Confirmed planet candidate'],
                  ['FALSE_POSITIVE', 'False positive'],
                  ['INSUFFICIENT', 'Insufficient data to confirm'],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex-1 text-center cursor-pointer px-3 py-2.5 rounded-lg border transition-colors text-sm ${
                    report.verdict === value
                      ? 'border-accent bg-accent/10 text-accent font-medium'
                      : 'border-border text-subtle hover:border-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="verdict"
                    checked={report.verdict === value}
                    onChange={() => update('verdict', value)}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>

          {/* 2. Planet parameters */}
          <section className="bg-panel rounded-lg border border-border p-5">
            <h2 className="text-sm font-semibold text-bright mb-3">
              2. Planet Parameters
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <ParamField
                label="Depth (%)"
                value={report.depthPercent}
                onChange={(v) => update('depthPercent', v)}
              />
              <ParamField
                label="Rp/Rs"
                value={report.rpOverRs}
                onChange={(v) => update('rpOverRs', v)}
              />
              <ParamField
                label="Radius (R⊕)"
                value={report.planetRadiusEarth}
                onChange={(v) => update('planetRadiusEarth', v)}
              />
              <ParamField
                label="Period (days)"
                value={report.orbitalPeriod}
                onChange={(v) => update('orbitalPeriod', v)}
              />
              <div>
                <label className="block text-[10px] text-muted uppercase tracking-wider mb-1">
                  Size Class
                </label>
                <select
                  value={report.sizeClass}
                  onChange={(e) => update('sizeClass', e.target.value)}
                  className="w-full bg-surface border border-border rounded px-2 py-1.5 text-text text-sm focus:outline-none focus:border-accent"
                >
                  <option value="">Select...</option>
                  <option value="Earth">Earth-class</option>
                  <option value="Neptune">Neptune-class</option>
                  <option value="Jupiter">Jupiter-class</option>
                </select>
              </div>
            </div>
          </section>

          {/* 3. Evidence used */}
          <section className="bg-panel rounded-lg border border-border p-5">
            <h2 className="text-sm font-semibold text-bright mb-3">
              3. Evidence Used (Trusted)
            </h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {trustedCards.map((idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-success/10 text-success text-xs rounded border border-success/30"
                >
                  {EW047_EVIDENCE_CARDS[idx]?.title}
                </span>
              ))}
              {trustedCards.length === 0 && (
                <span className="text-xs text-muted">No evidence trusted</span>
              )}
            </div>
            <textarea
              value={report.evidenceUsedText}
              onChange={(e) => update('evidenceUsedText', e.target.value)}
              placeholder="How does this evidence support your verdict?"
              rows={3}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-accent resize-none"
            />
          </section>

          {/* 4. Evidence rejected */}
          <section className="bg-panel rounded-lg border border-border p-5">
            <h2 className="text-sm font-semibold text-bright mb-3">
              4. Evidence Rejected
            </h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {rejectedCards.map((idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-danger/10 text-danger text-xs rounded border border-danger/30"
                >
                  {EW047_EVIDENCE_CARDS[idx]?.title}
                </span>
              ))}
              {rejectedCards.length === 0 && (
                <span className="text-xs text-muted">No evidence rejected</span>
              )}
            </div>
            <textarea
              value={report.evidenceRejectedText}
              onChange={(e) => update('evidenceRejectedText', e.target.value)}
              placeholder="Why did you reject this evidence?"
              rows={3}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-accent resize-none"
            />
          </section>

          {/* 5. Next action */}
          <section className="bg-panel rounded-lg border border-border p-5">
            <h2 className="text-sm font-semibold text-bright mb-3">
              5. Recommended Next Action
            </h2>
            <select
              value={report.nextAction}
              onChange={(e) => update('nextAction', e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-text text-sm mb-3 focus:outline-none focus:border-accent"
            >
              <option value="">Select an action...</option>
              {NEXT_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={report.nextActionReason}
              onChange={(e) => update('nextActionReason', e.target.value)}
              placeholder="Why this action?"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-accent"
            />
          </section>

          {/* 6. Confidence */}
          <section className="bg-panel rounded-lg border border-border p-5">
            <h2 className="text-sm font-semibold text-bright mb-3">
              6. Confidence Level
            </h2>
            <div className="flex items-center gap-4 mb-3">
              <input
                type="range"
                min={0}
                max={100}
                value={report.confidence}
                onChange={(e) =>
                  update('confidence', parseInt(e.target.value))
                }
                className="flex-1 accent-accent"
              />
              <span className="font-mono text-accent text-lg w-12 text-right">
                {report.confidence}%
              </span>
            </div>
            <input
              type="text"
              value={report.confidenceReason}
              onChange={(e) => update('confidenceReason', e.target.value)}
              placeholder="What would change your mind?"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-accent"
            />
          </section>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full py-3.5 bg-accent text-white rounded-lg font-semibold text-lg hover:bg-accent-glow transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit Final Report
          </button>
        </div>
      </div>
    </div>
  );
}

function ParamField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] text-muted uppercase tracking-wider mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface border border-border rounded px-2 py-1.5 text-text text-sm font-mono focus:outline-none focus:border-accent"
      />
    </div>
  );
}
