/**
 * Round 4 — The Confirmation (75–90 min)
 *
 * Target EW-047 — genuine eclipsing binary disguised as a planet.
 * 7 evidence cards with Trust/Reject toggles.
 * Gates behind qualification (prototype: toggle).
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame, type EvidenceTrust } from '../lib/gameState';
import { LightCurveViewer } from '../components/LightCurveViewer';
import {
  EW047_PRIMARY,
  EW047_SECONDARY,
  EW047_STELLAR,
  EW047_TRANSIT_DATA,
  EW047_FP_CHECKS,
  EW047_ASTRONOMER_NOTES,
  EW047_EVIDENCE_CARDS,
  EW047_MISLEADING_REPORT,
} from '../lib/ew047';

export default function Round4() {
  const navigate = useNavigate();
  const { state, dispatch } = useGame();
  const [openCard, setOpenCard] = useState<number | null>(null);
  const [evidenceTrust, setEvidenceTrust] = useState<EvidenceTrust[]>(() => {
    return state.evidenceTrust.length > 0
      ? state.evidenceTrust
      : EW047_EVIDENCE_CARDS.map((c) => ({
          cardIndex: c.index,
          label: c.title,
          trusted: null,
        }));
  });

  useEffect(() => {
    dispatch({ type: 'SET_ROUND', round: 4 });
    if (!state.roundTimers[4].isRunning && !state.completedRounds.includes(4)) {
      dispatch({ type: 'START_TIMER', round: 4 });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    dispatch({ type: 'SET_EVIDENCE_TRUST', trust: evidenceTrust });
  }, [evidenceTrust, dispatch]);

  if (!state.isQualified) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-bright mb-4">
            Round 4 — The Confirmation
          </h1>
          <p className="text-subtle mb-6">
            Your team did not qualify for the final round.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => {
                dispatch({ type: 'SET_QUALIFIED', qualified: true });
              }}
              className="block mx-auto px-6 py-2 bg-surface border border-border rounded-lg text-subtle text-sm hover:border-accent transition-colors"
            >
              [Prototype] Override — Enable Round 4
            </button>
            <button
              onClick={() => navigate('/results')}
              className="block mx-auto px-6 py-2 bg-accent text-white rounded-lg text-sm"
            >
              View Results
            </button>
          </div>
        </div>
      </div>
    );
  }

  const setTrust = (index: number, trusted: boolean) => {
    setEvidenceTrust((prev) =>
      prev.map((e) =>
        e.cardIndex === index ? { ...e, trusted } : e
      )
    );
  };

  const allDecided = evidenceTrust.every((e) => e.trusted !== null);

  const handleProceedToReport = () => {
    navigate('/report');
  };

  return (
    <div className="min-h-screen bg-void">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-bright">
            Round 4 — The Confirmation
          </h1>
          <p className="text-subtle text-sm">
            Target <span className="text-accent font-mono">EW-047</span> — a
            candidate requiring your final assessment. Review all evidence,
            then proceed to your investigation report.
          </p>
        </div>

        {/* Evidence cards grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {EW047_EVIDENCE_CARDS.map((card) => {
            const trust = evidenceTrust.find((e) => e.cardIndex === card.index);
            const isOpen = openCard === card.index;

            return (
              <div
                key={card.index}
                className={`bg-panel rounded-lg border transition-colors ${
                  isOpen ? 'border-accent' : 'border-border'
                }`}
              >
                {/* Card header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() =>
                    setOpenCard(isOpen ? null : card.index)
                  }
                >
                  <div>
                    <div className="text-xs text-muted uppercase tracking-wider">
                      {card.category}
                    </div>
                    <div className="text-sm font-semibold text-bright">
                      {card.title}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {trust?.trusted !== null && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          trust?.trusted
                            ? 'bg-success/20 text-success'
                            : 'bg-danger/20 text-danger'
                        }`}
                      >
                        {trust?.trusted ? 'TRUSTED' : 'REJECTED'}
                      </span>
                    )}
                    <span className="text-muted text-lg">
                      {isOpen ? '▾' : '▸'}
                    </span>
                  </div>
                </div>

                {/* Card content (expanded) */}
                {isOpen && (
                  <div className="border-t border-border p-4">
                    <CardContent cardIndex={card.index} />

                    {/* Trust/Reject buttons */}
                    <div className="flex gap-3 mt-4 pt-4 border-t border-border">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTrust(card.index, true);
                        }}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                          trust?.trusted === true
                            ? 'bg-success text-white'
                            : 'bg-surface border border-border text-subtle hover:border-success hover:text-success'
                        }`}
                      >
                        ✓ Trust
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTrust(card.index, false);
                        }}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                          trust?.trusted === false
                            ? 'bg-danger text-white'
                            : 'bg-surface border border-border text-subtle hover:border-danger hover:text-danger'
                        }`}
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary bar */}
        <div className="bg-panel rounded-lg border border-border p-4 flex items-center justify-between">
          <div className="text-sm text-subtle">
            <span className="text-text font-medium">
              {evidenceTrust.filter((e) => e.trusted !== null).length}
            </span>
            {' / '}
            {EW047_EVIDENCE_CARDS.length} evidence items reviewed
            {' • '}
            <span className="text-success">
              {evidenceTrust.filter((e) => e.trusted === true).length} trusted
            </span>
            {' • '}
            <span className="text-danger">
              {evidenceTrust.filter((e) => e.trusted === false).length} rejected
            </span>
          </div>
          <button
            onClick={handleProceedToReport}
            disabled={!allDecided}
            className="px-6 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent-glow transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Proceed to Report →
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card content renderer
// ---------------------------------------------------------------------------

function CardContent({ cardIndex }: { cardIndex: number }) {
  switch (cardIndex) {
    case 0: // Primary light curve
      return (
        <div>
          <div className="text-xs text-muted mb-2">
            Primary photometric observation — Epoch 1
          </div>
          <LightCurveViewer
            points={EW047_PRIMARY.points}
            width={520}
            height={280}
            enableDipMarkers={true}
            enableVerticalMarkers={true}
            enableHorizontalLines={true}
          />
        </div>
      );

    case 1: // Second observation
      return (
        <div>
          <div className="text-xs text-muted mb-2">
            Follow-up observation — Epoch 2
          </div>
          <LightCurveViewer
            points={EW047_SECONDARY.points}
            width={520}
            height={280}
            enableDipMarkers={true}
            enableVerticalMarkers={true}
            enableHorizontalLines={true}
          />
        </div>
      );

    case 2: // Stellar information
      return (
        <div className="space-y-2 text-sm">
          {Object.entries({
            'Target ID': EW047_STELLAR.targetId,
            'Star Name': EW047_STELLAR.starName,
            'RA / Dec': `${EW047_STELLAR.ra} / ${EW047_STELLAR.dec}`,
            'Magnitude': `V = ${EW047_STELLAR.magnitude}`,
            'Spectral Type': EW047_STELLAR.spectralType,
            'Classification': EW047_STELLAR.stellarClass,
            'Radius': `${EW047_STELLAR.radiusSolar} R☉`,
            'Mass': `${EW047_STELLAR.massSolar} M☉`,
            'Temperature': `${EW047_STELLAR.temperatureK} K`,
            'Metallicity [Fe/H]': EW047_STELLAR.metallicity.toString(),
            'Distance': EW047_STELLAR.distance,
            'Luminosity': `${EW047_STELLAR.luminositySolar} L☉`,
          }).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-muted">{k}</span>
              <span className="font-mono text-text">{v}</span>
            </div>
          ))}
        </div>
      );

    case 3: // Transit parameters
      return (
        <div className="space-y-2 text-sm">
          {Object.entries({
            'Transit Depth': `${(EW047_TRANSIT_DATA.depth * 100).toFixed(2)}% ± ${(EW047_TRANSIT_DATA.depthUncertainty * 100).toFixed(2)}%`,
            'Duration': `${EW047_TRANSIT_DATA.duration} hours`,
            'Period': `${EW047_TRANSIT_DATA.period} ± ${EW047_TRANSIT_DATA.periodUncertainty} days`,
            'Epoch (BJD)': EW047_TRANSIT_DATA.epoch.toFixed(3),
            'Transit Count': EW047_TRANSIT_DATA.transitCount.toString(),
          }).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-muted">{k}</span>
              <span className="font-mono text-text">{v}</span>
            </div>
          ))}
        </div>
      );

    case 4: // False-positive checks
      return (
        <div className="space-y-4 text-sm">
          {/* Odd/Even */}
          <div className="bg-surface rounded-lg p-3">
            <h4 className="text-xs text-muted uppercase tracking-wider mb-2">
              Odd/Even Depth Comparison
            </h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted">Odd transit depth</span>
                <span className="font-mono text-text">{EW047_FP_CHECKS.oddEvenDepth.oddDepthPercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Even transit depth</span>
                <span className="font-mono text-text">{EW047_FP_CHECKS.oddEvenDepth.evenDepthPercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Difference</span>
                <span className="font-mono text-warning">{EW047_FP_CHECKS.oddEvenDepth.differencePercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Significance</span>
                <span className="font-mono text-text">{EW047_FP_CHECKS.oddEvenDepth.significance}</span>
              </div>
            </div>
            <p className="text-xs text-subtle mt-2 italic">{EW047_FP_CHECKS.oddEvenDepth.note}</p>
          </div>

          {/* Centroid */}
          <div className="bg-surface rounded-lg p-3">
            <h4 className="text-xs text-muted uppercase tracking-wider mb-2">
              Centroid Shift
            </h4>
            <div className="flex justify-between">
              <span className="text-muted">Shift detected</span>
              <span className="font-mono text-warning">Yes — {EW047_FP_CHECKS.centroidShift.shiftArcsec}"</span>
            </div>
            <p className="text-xs text-subtle mt-2 italic">{EW047_FP_CHECKS.centroidShift.note}</p>
          </div>

          {/* Nearby stars */}
          <div className="bg-surface rounded-lg p-3">
            <h4 className="text-xs text-muted uppercase tracking-wider mb-2">
              Nearby Stars in Aperture
            </h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted">Companion detected</span>
                <span className="font-mono text-warning">Yes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Separation</span>
                <span className="font-mono text-text">{EW047_FP_CHECKS.nearbyStars.separationArcsec}"</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">ΔV magnitude</span>
                <span className="font-mono text-text">{EW047_FP_CHECKS.nearbyStars.deltaMagnitude}</span>
              </div>
            </div>
            <p className="text-xs text-subtle mt-2 italic">{EW047_FP_CHECKS.nearbyStars.note}</p>
          </div>

          {/* Depth consistency */}
          <div className="bg-surface rounded-lg p-3">
            <h4 className="text-xs text-muted uppercase tracking-wider mb-2">
              Depth Consistency
            </h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted">Primary depth</span>
                <span className="font-mono text-text">{EW047_FP_CHECKS.depthConsistency.primaryDepthPercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Secondary depth</span>
                <span className="font-mono text-text">{EW047_FP_CHECKS.depthConsistency.secondaryDepthPercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Consistent</span>
                <span className="font-mono text-success">Yes</span>
              </div>
            </div>
            <p className="text-xs text-subtle mt-2 italic">{EW047_FP_CHECKS.depthConsistency.note}</p>
          </div>
        </div>
      );

    case 5: // Astronomer's notes
      return (
        <div>
          <div className="text-xs text-muted mb-2">
            <span className="font-medium text-text">{EW047_ASTRONOMER_NOTES.author}</span>
            {' — '}{EW047_ASTRONOMER_NOTES.date}
          </div>
          <div className="bg-surface rounded-lg p-4 text-sm text-text leading-relaxed whitespace-pre-line">
            {EW047_ASTRONOMER_NOTES.text}
          </div>
        </div>
      );

    case 6: // Misleading survey report
      return (
        <div>
          <div className="text-xs text-muted mb-2">
            <span className="font-medium text-text">{EW047_MISLEADING_REPORT.source}</span>
            {' — '}{EW047_MISLEADING_REPORT.date}
          </div>
          <h4 className="text-sm font-semibold text-accent mb-2">
            {EW047_MISLEADING_REPORT.title}
          </h4>
          <div className="bg-surface rounded-lg p-4 text-sm text-text leading-relaxed whitespace-pre-line">
            {EW047_MISLEADING_REPORT.text}
          </div>
        </div>
      );

    default:
      return <div className="text-muted text-sm">No content available.</div>;
  }
}
