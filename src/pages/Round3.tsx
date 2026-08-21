/**
 * Round 3 — Data Room (50–60 min)
 *
 * One target, full data packet. Player measures everything themselves:
 * - Drag baseline + in-transit lines → depth
 * - Click two consecutive transits → period
 * - Bracket one transit → duration
 * Then enters derived values.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame, type Round3Submission } from '../lib/gameState';
import { generateCurve } from '../lib/lightcurve';
import { LightCurveViewer, type ViewerState } from '../components/LightCurveViewer';
import { scoreRound3 } from '../lib/scoring';

const INITIAL_SUBMISSION: Round3Submission = {
  depthPercent: '',
  rpOverRs: '',
  planetRadiusEarth: '',
  sizeClass: '',
  orbitalPeriod: '',
  transitDuration: '',
  baselineFlux: null,
  transitFlux: null,
  transitStart: null,
  transitEnd: null,
  periodMarker1: null,
  periodMarker2: null,
};

export default function Round3() {
  const navigate = useNavigate();
  const { state, dispatch, getElapsedMs } = useGame();
  const [submission, setSubmission] = useState<Round3Submission>(
    state.round3Submission || INITIAL_SUBMISSION
  );

  const teamSeed = state.team?.seed ?? 42;

  // Generate a planet curve for the data room (0.15% depth floor for measurement task)
  const curve = useMemo(
    () => generateCurve('planet', teamSeed + 2000, 'medium', false, { depthFloor: 0.0015 }),
    [teamSeed]
  );
  const { truth } = curve;

  useEffect(() => {
    dispatch({ type: 'SET_ROUND', round: 3 });
    if (!state.roundTimers[3].isRunning && !state.completedRounds.includes(3)) {
      dispatch({ type: 'START_TIMER', round: 3 });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    dispatch({ type: 'SET_ROUND3_SUBMISSION', submission });
  }, [submission, dispatch]);

  const handleViewerStateChange = useCallback((viewerState: ViewerState) => {
    setSubmission((prev) => ({
      ...prev,
      baselineFlux: viewerState.horizontalLines.baseline,
      transitFlux: viewerState.horizontalLines.transitLevel,
      transitStart: viewerState.verticalMarkers.start,
      transitEnd: viewerState.verticalMarkers.end,
      // Use first two dip markers as period markers
      periodMarker1:
        viewerState.dipMarkers.length >= 1
          ? viewerState.dipMarkers[0].t
          : null,
      periodMarker2:
        viewerState.dipMarkers.length >= 2
          ? viewerState.dipMarkers[1].t
          : null,
    }));
  }, []);

  // Auto-computed measurements from viewer interactions
  const measuredDepth =
    submission.baselineFlux !== null && submission.transitFlux !== null
      ? Math.abs(submission.baselineFlux - submission.transitFlux)
      : null;

  const measuredPeriod =
    submission.periodMarker1 !== null && submission.periodMarker2 !== null
      ? Math.abs(submission.periodMarker2 - submission.periodMarker1)
      : null;

  const measuredDuration =
    submission.transitStart !== null && submission.transitEnd !== null
      ? Math.abs(submission.transitEnd - submission.transitStart) * 24 // days → hours
      : null;

  const handleSubmit = () => {
    dispatch({ type: 'STOP_TIMER', round: 3 });
    const elapsed = getElapsedMs(3);
    const score = scoreRound3(submission, truth, elapsed);
    dispatch({ type: 'SET_SCORE', round: 3, score });
    dispatch({ type: 'COMPLETE_ROUND', round: 3 });
    navigate('/transition/4');
  };

  const hasRequiredFields =
    submission.depthPercent.trim() !== '' &&
    submission.rpOverRs.trim() !== '' &&
    submission.planetRadiusEarth.trim() !== '' &&
    submission.sizeClass !== '' &&
    submission.orbitalPeriod.trim() !== '';

  return (
    <div className="min-h-screen bg-void">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-bright">
            Round 3 — Data Room
          </h1>
          <p className="text-subtle text-sm">
            One target, full data. Measure everything from the light curve,
            then compute the planet's properties.
          </p>
        </div>

        <div className="grid grid-cols-[1fr_340px] gap-6">
          {/* Left: Viewer */}
          <div>
            <div className="bg-panel rounded-lg border border-border p-4 mb-4">
              <div className="text-xs text-muted mb-2">
                Use all tools: dip markers for period, vertical markers to
                bracket a transit, horizontal lines for depth.
              </div>
              <LightCurveViewer
                points={curve.points}
                width={820}
                height={380}
                initialViewWindowDays={10.0}
                enableDipMarkers={true}
                enableVerticalMarkers={true}
                enableHorizontalLines={true}
                onStateChange={handleViewerStateChange}
              />
            </div>

            {/* Auto-measured values */}
            <div className="bg-panel rounded-lg border border-border p-4 mb-4">
              <h3 className="text-sm font-semibold text-bright mb-3">
                Your Measurements (from plot)
              </h3>
              <div className="grid grid-cols-3 gap-4 text-sm font-mono">
                <div>
                  <div className="text-xs text-muted">Transit Depth</div>
                  <div className={measuredDepth ? 'text-baseline' : 'text-muted'}>
                    {measuredDepth
                      ? `${(measuredDepth * 100).toFixed(4)}%`
                      : 'Set horizontal lines'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Orbital Period</div>
                  <div className={measuredPeriod ? 'text-transit-mark' : 'text-muted'}>
                    {measuredPeriod
                      ? `${measuredPeriod.toFixed(3)} days`
                      : 'Mark two transits'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Transit Duration</div>
                  <div className={measuredDuration ? 'text-violet-400' : 'text-muted'}>
                    {measuredDuration
                      ? `${measuredDuration.toFixed(2)} hours`
                      : 'Set vertical brackets'}
                  </div>
                </div>
              </div>
            </div>

            {/* Formula reference */}
            <div className="bg-surface/50 rounded-lg border border-border p-4 text-sm">
              <h3 className="text-xs text-muted uppercase tracking-wider mb-2">
                Formula Reference
              </h3>
              <div className="space-y-1 text-subtle font-mono text-xs">
                <div>
                  depth ≈ (R<sub>p</sub>/R<sub>s</sub>)²
                </div>
                <div>
                  R<sub>p</sub>/R<sub>s</sub> = √depth
                </div>
                <div>
                  R<sub>p</sub>(Earth radii) = (R<sub>p</sub>/R<sub>s</sub>) ×
                  R<sub>star</sub>(solar) × 109.2
                </div>
              </div>
            </div>
          </div>

          {/* Right: Data packet + form */}
          <div className="space-y-4">
            {/* Data packet */}
            <div className="bg-panel rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-bright mb-3">
                📋 Target Data
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Target ID</span>
                  <span className="font-mono text-text">
                    EW-{(teamSeed % 900 + 100).toString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Star Radius</span>
                  <span className="font-mono text-text">
                    {truth.starRadiusSolar.toFixed(3)} R☉
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Star Temp</span>
                  <span className="font-mono text-text">
                    {truth.starTempK.toFixed(0)} K
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Observation</span>
                  <span className="font-mono text-text">
                    {(curve.points[curve.points.length - 1].t).toFixed(1)} days
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Data Points</span>
                  <span className="font-mono text-text">
                    {curve.points.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Derived values form */}
            <div className="bg-panel rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-bright mb-3">
                Derived Parameters
              </h3>
              <div className="space-y-3">
                <FormField
                  label="Transit Depth (%)"
                  value={submission.depthPercent}
                  onChange={(v) =>
                    setSubmission((p) => ({ ...p, depthPercent: v }))
                  }
                  placeholder="e.g. 1.23"
                />
                <FormField
                  label="Rp / Rs"
                  value={submission.rpOverRs}
                  onChange={(v) =>
                    setSubmission((p) => ({ ...p, rpOverRs: v }))
                  }
                  placeholder="e.g. 0.111"
                />
                <FormField
                  label="Planet Radius (R⊕)"
                  value={submission.planetRadiusEarth}
                  onChange={(v) =>
                    setSubmission((p) => ({ ...p, planetRadiusEarth: v }))
                  }
                  placeholder="e.g. 12.1"
                />
                <div>
                  <label className="block text-xs text-muted uppercase tracking-wider mb-1">
                    Size Class
                  </label>
                  <select
                    value={submission.sizeClass}
                    onChange={(e) =>
                      setSubmission((p) => ({
                        ...p,
                        sizeClass: e.target.value as 'Earth' | 'Neptune' | 'Jupiter' | '',
                      }))
                    }
                    className="w-full bg-surface border border-border rounded px-3 py-2 text-text text-sm focus:outline-none focus:border-accent"
                  >
                    <option value="">Select...</option>
                    <option value="Earth">Earth-class (&lt; 2 R⊕)</option>
                    <option value="Neptune">Neptune-class (2–6 R⊕)</option>
                    <option value="Jupiter">Jupiter-class (&gt; 6 R⊕)</option>
                  </select>
                </div>
                <FormField
                  label="Orbital Period (days)"
                  value={submission.orbitalPeriod}
                  onChange={(v) =>
                    setSubmission((p) => ({ ...p, orbitalPeriod: v }))
                  }
                  placeholder="e.g. 3.45"
                />
                <FormField
                  label="Transit Duration (hours)"
                  value={submission.transitDuration}
                  onChange={(v) =>
                    setSubmission((p) => ({ ...p, transitDuration: v }))
                  }
                  placeholder="e.g. 2.5"
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!hasRequiredFields}
              className="w-full py-3 bg-success text-white rounded-lg font-semibold hover:bg-success/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Submit Round 3
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-xs text-muted uppercase tracking-wider mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface border border-border rounded px-3 py-2 text-text text-sm font-mono focus:outline-none focus:border-accent transition-colors"
      />
    </div>
  );
}
