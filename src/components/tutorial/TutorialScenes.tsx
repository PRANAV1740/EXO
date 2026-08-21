/**
 * TutorialScenes.tsx — Renderers for the 11 tutorial scenes.
 * Uses fixed seed light curves and real LightCurveViewer / MiniCurveRenderer components.
 * Animation cues are re-anchored to line indices rather than hardcoded absolute milliseconds.
 */

import { useMemo } from 'react';
import { generateCurve } from '../../lib/lightcurve';
import { TUTORIAL_SEED, TUTORIAL_BINARY_SEED } from '../../lib/tutorialScript';
import { LightCurveViewer } from '../LightCurveViewer';
import { MiniCurveRenderer } from '../MiniCurveRenderer';
import { SyntheticCursor } from './SyntheticCursor';

interface SceneVisualProps {
  sceneIndex: number;
  timeMs: number;
  activeLineIndex?: number;
}

// ---------------------------------------------------------------------------
// Scene 1 Visual: Star in space + title card
// ---------------------------------------------------------------------------
export function Scene1Visual({ timeMs }: { timeMs: number }) {
  const opacity = Math.min(1, timeMs / 2000);

  return (
    <div className="w-full h-80 bg-void rounded-xl border border-border flex flex-col items-center justify-center relative overflow-hidden">
      {/* Starfield */}
      <div className="absolute inset-0 opacity-40">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: `${1 + (i % 2)}px`,
              height: `${1 + (i % 2)}px`,
              left: `${(i * 23) % 100}%`,
              top: `${(i * 37) % 100}%`,
              opacity: 0.2 + (i % 4) * 0.15,
            }}
          />
        ))}
      </div>

      {/* Star */}
      <div
        className="relative transition-opacity duration-1000"
        style={{ opacity }}
      >
        <div className="w-24 h-24 rounded-full bg-yellow-100 shadow-[0_0_60px_rgba(250,204,21,0.6)] flex items-center justify-center animate-pulse">
          <div className="w-20 h-20 rounded-full bg-yellow-200 blur-xs" />
        </div>
      </div>

      {/* Title overlay */}
      <div
        className="mt-6 text-center transition-all duration-1000"
        style={{
          opacity,
          transform: `translateY(${(1 - opacity) * 10}px)`,
        }}
      >
        <h1 className="text-3xl font-bold text-bright tracking-wider">
          EXOPLANET <span className="text-accent">WATCH</span>
        </h1>
        <p className="text-xs text-subtle mt-1 uppercase tracking-widest">
          Interactive Astronomical Walkthrough
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scene 2 Visual: Orbiting star on left + dynamic light curve on right
// ---------------------------------------------------------------------------
export function Scene2Visual({ timeMs }: { timeMs: number }) {
  // Orbit progress (0 to 1 over 5 seconds, looping)
  const cycleTime = (timeMs % 5000) / 5000;
  const planetX = -20 + cycleTime * 140; // percentage
  const isTransiting = planetX >= 35 && planetX <= 65;

  // Generate points up to current time
  const points = useMemo(() => {
    const totalPoints = 300;
    const pts = [];
    for (let i = 0; i < totalPoints; i++) {
      const t = (i / totalPoints) * 20;
      let flux = 1.0;
      // Dips at t = 3, 8, 13, 18
      const dips = [3, 8, 13, 18];
      for (const d of dips) {
        if (Math.abs(t - d) < 0.5) {
          flux -= 0.02 * (1 - Math.abs(t - d) / 0.5);
        }
      }
      pts.push({ t, flux });
    }
    return pts;
  }, []);

  return (
    <div className="w-full h-80 bg-panel rounded-xl border border-border p-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
      {/* Left: Star & orbiting planet */}
      <div className="h-full bg-void rounded-lg border border-border/60 p-4 flex flex-col items-center justify-center relative overflow-hidden">
        <span className="absolute top-3 left-3 text-xs font-mono text-muted uppercase">
          Physical System View
        </span>

        <div className="relative w-48 h-32 flex items-center justify-center">
          {/* Star */}
          <div className="w-20 h-20 rounded-full bg-yellow-200 shadow-[0_0_40px_rgba(250,204,21,0.5)]" />

          {/* Planet */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-900 border border-gray-600 shadow-md"
            style={{
              left: `${planetX}%`,
              zIndex: isTransiting ? 20 : 5,
              opacity: planetX >= 0 && planetX <= 100 ? 1 : 0,
            }}
          />
        </div>

        <div className="mt-2 text-xs font-mono text-center">
          {isTransiting ? (
            <span className="text-warning font-semibold animate-pulse">
              ● TRANSIT IN PROGRESS (STALLING FLUX)
            </span>
          ) : (
            <span className="text-subtle">Star Out of Occultation</span>
          )}
        </div>
      </div>

      {/* Right: Light Curve graph */}
      <div className="h-full bg-void rounded-lg border border-border/60 p-2 flex items-center justify-center">
        <MiniCurveRenderer points={points} width={420} height={260} title="Light Curve (Flux vs Time)" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scene 3 Visual: Full-width plot with axis & feature callouts (Line-anchored)
// ---------------------------------------------------------------------------
export function Scene3Visual({ activeLineIndex = 0 }: { activeLineIndex?: number }) {
  const curve = useMemo(() => generateCurve('planet', TUTORIAL_SEED, 'medium'), []);
  const showBaseline = activeLineIndex >= 1;
  const showDepth = activeLineIndex >= 2;
  const showPeriod = activeLineIndex >= 3;

  return (
    <div className="w-full h-80 bg-panel rounded-xl border border-border p-4 relative flex flex-col items-center justify-center">
      <LightCurveViewer points={curve.points} width={820} height={270} readOnly={true} />

      {/* Line-anchored Callout Overlays */}
      {showBaseline && (
        <div className="absolute top-16 left-28 bg-baseline/20 border border-baseline text-baseline text-xs px-2.5 py-1 rounded shadow-lg animate-bounce">
          ▲ Baseline (1.0)
        </div>
      )}
      {showDepth && (
        <div className="absolute bottom-20 left-[260px] bg-transit-mark/20 border border-transit-mark text-transit-mark text-xs px-2.5 py-1 rounded shadow-lg animate-bounce">
          ▼ Transit Depth
        </div>
      )}
      {showPeriod && (
        <div className="absolute top-24 left-[440px] bg-violet-500/20 border border-violet-400 text-violet-300 text-xs px-2.5 py-1 rounded shadow-lg">
          ◄── Orbital Period ──►
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scene 4 Visual: 5 Suspects grid (Line-anchored & zoomed mini-plots)
// ---------------------------------------------------------------------------
export function Scene4Visual({ activeLineIndex = 0 }: { activeLineIndex?: number }) {
  const planetCurveFull = useMemo(() => generateCurve('planet', TUTORIAL_SEED, 'medium'), []);
  const binaryCurveFull = useMemo(() => generateCurve('eclipsingBinary', TUTORIAL_BINARY_SEED, 'medium'), []);
  const varCurveFull = useMemo(() => generateCurve('stellarVariability', TUTORIAL_SEED + 2, 'medium'), []);
  const noiseCurveFull = useMemo(() => generateCurve('instrumentNoise', TUTORIAL_SEED + 3, 'medium'), []);
  const singleCurveFull = useMemo(() => generateCurve('insufficientData', TUTORIAL_SEED + 4, 'medium'), []);

  // Zoomed mini-plot point arrays so transits occupy >= 5% of mini-plot width
  const planetPoints = useMemo(() => {
    return planetCurveFull.points.filter((p) => p.t >= 3.0 && p.t <= 6.0);
  }, [planetCurveFull]);

  const binaryPoints = useMemo(() => {
    return binaryCurveFull.points.filter((p) => p.t >= 1.0 && p.t <= 6.0);
  }, [binaryCurveFull]);

  const varPoints = useMemo(() => {
    return varCurveFull.points.filter((p) => p.t >= 0 && p.t <= 8.0);
  }, [varCurveFull]);

  const noisePoints = useMemo(() => {
    return noiseCurveFull.points.filter((p) => p.t >= 0 && p.t <= 6.0);
  }, [noiseCurveFull]);

  const singlePoints = useMemo(() => {
    const epoch = singleCurveFull.truth.epoch;
    return singleCurveFull.points.filter((p) => p.t >= Math.max(0, epoch - 1.5) && p.t <= epoch + 1.5);
  }, [singleCurveFull]);

  // Map activeLineIndex (1 to 5) to suspect card index
  const highlightedIndex = activeLineIndex >= 1 ? Math.min(3, activeLineIndex - 1) : 0;

  return (
    <div className="w-full h-80 bg-panel rounded-xl border border-border p-3 grid grid-cols-3 gap-3 overflow-hidden">
      <SuspectCard title="1. Planet Transit" points={planetPoints} highlight={highlightedIndex === 0} />
      <SuspectCard title="2. Eclipsing Binary" points={binaryPoints} highlight={highlightedIndex === 1} />
      <SuspectCard title="3. Stellar Variability" points={varPoints} highlight={highlightedIndex === 2} />
      <SuspectCard title="4. Instrument Noise" points={noisePoints} highlight={highlightedIndex === 3} />
      <SuspectCard title="5. Insufficient Data" points={singlePoints} highlight={highlightedIndex === 3} />
    </div>
  );
}

function SuspectCard({ title, points, highlight }: { title: string; points: { t: number; flux: number }[]; highlight: boolean }) {
  return (
    <div className={`bg-void p-2 rounded-lg border transition-all ${highlight ? 'border-accent ring-1 ring-accent' : 'border-border opacity-70'}`}>
      <div className="text-[11px] font-semibold text-bright mb-1 truncate">{title}</div>
      <MiniCurveRenderer points={points} width={260} height={100} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scene 5 Visual: Planet vs Eclipsing Binary Side-by-Side (Line-anchored)
// ---------------------------------------------------------------------------
export function Scene5Visual({ activeLineIndex: _activeLineIndex = 0 }: { activeLineIndex?: number }) {
  const planetCurve = useMemo(() => generateCurve('planet', TUTORIAL_SEED, 'medium'), []);
  const binaryCurve = useMemo(() => generateCurve('eclipsingBinary', TUTORIAL_BINARY_SEED, 'medium'), []);

  return (
    <div className="w-full h-80 bg-panel rounded-xl border border-border p-4 grid grid-cols-2 gap-4">
      {/* Left: Planet */}
      <div className="bg-void p-3 rounded-lg border border-border flex flex-col justify-between relative">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold text-bright">Planet Transit</span>
          <span className="text-[10px] text-baseline bg-baseline/10 border border-baseline/30 px-2 py-0.5 rounded">
            Flat Bottom
          </span>
        </div>
        <MiniCurveRenderer points={planetCurve.points} width={380} height={200} />
      </div>

      {/* Right: Eclipsing Binary */}
      <div className="bg-void p-3 rounded-lg border border-accent/40 flex flex-col justify-between relative">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold text-warning">Eclipsing Binary</span>
          <span className="text-[10px] text-warning bg-warning/10 border border-warning/30 px-2 py-0.5 rounded animate-pulse">
            Odd Dips 15.0% Deeper (V-Shape)
          </span>
        </div>
        <MiniCurveRenderer points={binaryCurve.points} width={380} height={200} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scene 6 Visual: Interactive Click Simulation (Line-anchored)
// ---------------------------------------------------------------------------
export function Scene6Visual({ activeLineIndex = 0 }: { activeLineIndex?: number }) {
  const curve = useMemo(() => generateCurve('planet', TUTORIAL_SEED, 'medium'), []);
  const hasMarker = activeLineIndex >= 1;
  const isClicking = activeLineIndex === 1;

  // Cursor coords matching dip 1 at t=4.12d (x=227px)
  const cursorX = activeLineIndex >= 1 ? 227 : 150;
  const cursorY = activeLineIndex >= 1 ? 180 : 100;

  return (
    <div className="w-full h-80 bg-panel rounded-xl border border-border p-4 relative flex items-center justify-center">
      <LightCurveViewer
        points={curve.points}
        width={820}
        height={270}
        initialState={{
          dipMarkers: hasMarker ? [{ id: 'tut-1', t: 4.12 }] : [],
          verticalMarkers: { start: null, end: null },
          horizontalLines: { baseline: null, transitLevel: null },
        }}
        readOnly={true}
      />
      <SyntheticCursor x={cursorX} y={cursorY} clicking={isClicking} label="Interactive Cursor" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scene 7 Visual: Round 1 UI Demo (Line-anchored)
// ---------------------------------------------------------------------------
export function Scene7Visual({ activeLineIndex = 0 }: { activeLineIndex?: number }) {
  const curve = useMemo(() => generateCurve('planet', TUTORIAL_SEED, 'medium'), []);
  const reasoningText = activeLineIndex >= 2 ? 'Clear flat-bottomed periodic transits detected at t=4.12d and t=9.12d.' : '';

  return (
    <div className="w-full h-80 bg-panel rounded-xl border border-border p-4 flex flex-col justify-between">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-bright">Round 1 Demo — Observation A</span>
        <span className="text-xs text-muted font-mono">Curve 1 of 8</span>
      </div>

      <div className="h-44 bg-void rounded border border-border overflow-hidden">
        <MiniCurveRenderer points={curve.points} width={800} height={170} />
      </div>

      <div className="flex items-center gap-6 mt-3 bg-surface p-2 rounded border border-border text-xs">
        <span className="text-subtle font-medium">Classification:</span>
        <span className="px-3 py-1 rounded bg-accent text-white font-semibold">TRANSIT</span>
        <span className="text-muted">NO TRANSIT</span>
        <span className="text-muted">UNCERTAIN</span>
      </div>

      <div className="mt-2 text-xs font-mono text-accent bg-surface px-3 py-1.5 rounded border border-border truncate">
        Reasoning: {reasoningText}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scene 8 Visual: Round 2 UI Demo
// ---------------------------------------------------------------------------
export function Scene8Visual({ activeLineIndex: _activeLineIndex }: { activeLineIndex?: number }) {
  const curve = useMemo(() => generateCurve('eclipsingBinary', TUTORIAL_BINARY_SEED, 'hard'), []);

  return (
    <div className="w-full h-80 bg-panel rounded-xl border border-border p-4 flex flex-col justify-between">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-bright">Round 2 Demo — Target Beta</span>
        <span className="text-xs text-warning font-mono">Hard Noise</span>
      </div>

      <div className="h-44 bg-void rounded border border-border">
        <MiniCurveRenderer points={curve.points} width={800} height={170} />
      </div>

      <div className="flex items-center gap-4 mt-3 bg-surface p-2 rounded border border-border text-xs">
        <span className="text-subtle font-medium">Classification:</span>
        <span className="text-muted">PLANET CANDIDATE</span>
        <span className="px-3 py-1 rounded bg-danger text-white font-semibold">FALSE POSITIVE</span>
        <span className="text-muted">INSUFFICIENT DATA</span>
      </div>

      <div className="mt-2 text-xs text-subtle bg-surface px-3 py-1.5 rounded border border-border">
        Feature clicked: <span className="text-warning">Shallower odd/even alternate transit (V-shape)</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scene 9 Visual: Round 3 Data Room Demo (Line-anchored)
// ---------------------------------------------------------------------------
export function Scene9Visual({ activeLineIndex = 0 }: { activeLineIndex?: number }) {
  const curve = useMemo(() => generateCurve('planet', TUTORIAL_SEED, 'medium'), []);
  const hasLines = activeLineIndex >= 1; // Line 1: "Drag the baseline to where the star sits normally..."

  return (
    <div className="w-full h-80 bg-panel rounded-xl border border-border p-4 grid grid-cols-[1fr_260px] gap-4">
      {/* Left: Viewer with horizontal/vertical lines */}
      <div className="bg-void rounded border border-border p-2">
        <LightCurveViewer
          points={curve.points}
          width={500}
          height={240}
          initialState={{
            dipMarkers: [],
            verticalMarkers: hasLines ? { start: 4.12, end: 4.25 } : { start: null, end: null },
            horizontalLines: hasLines ? { baseline: 1.0, transitLevel: 0.98975 } : { baseline: null, transitLevel: null },
          }}
          readOnly={true}
        />
      </div>

      {/* Right: Derived Math Panel */}
      <div className="bg-surface p-3 rounded-lg border border-border flex flex-col justify-between text-xs font-mono">
        <div className="space-y-2">
          <div className="text-bright font-bold">Derived Parameters</div>
          <div className="flex justify-between">
            <span className="text-muted">Depth:</span>
            <span className="text-baseline font-bold">{hasLines ? '1.02%' : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Rp/Rs (√Depth):</span>
            <span className="text-accent font-bold">{hasLines ? '0.101' : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Planet Radius:</span>
            <span className="text-yellow-400 font-bold">{hasLines ? '10.3 R⊕' : '—'}</span>
          </div>
        </div>

        <div className="p-2 bg-deep rounded border border-border text-[10px] text-subtle space-y-1">
          <div>Depth = 0.0102</div>
          <div>Rp/Rs = √0.0102 = 0.101</div>
          <div>R_planet = 0.101 × 0.94 × 109.2</div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scene 10 Visual: Round 4 Confirmation & Evidence Cards (Line-anchored)
// ---------------------------------------------------------------------------
export function Scene10Visual({ activeLineIndex = 0 }: { activeLineIndex?: number }) {
  const card2Trusted = activeLineIndex >= 2;
  const card3Trusted = activeLineIndex >= 2;

  return (
    <div className="w-full h-80 bg-panel rounded-xl border border-border p-4 flex flex-col justify-between">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-bright">Round 4 Demo — Candidate EW-047</span>
        <span className="text-xs text-subtle font-mono">7 Evidence Cards</span>
      </div>

      <div className="grid grid-cols-4 gap-2 my-2">
        <CardStub title="1. Primary Light Curve" status="UNVETTED" color="bg-surface text-muted" />
        <CardStub title="2. Second Observation" status="UNVETTED" color="bg-surface text-muted" />
        <CardStub
          title="3. Stellar Info"
          status={card2Trusted ? 'TRUSTED' : 'UNVETTED'}
          color={card2Trusted ? 'bg-success/20 text-success' : 'bg-surface text-muted'}
        />
        <CardStub
          title="4. Transit Parameters"
          status={card3Trusted ? 'TRUSTED' : 'UNVETTED'}
          color={card3Trusted ? 'bg-success/20 text-success' : 'bg-surface text-muted'}
        />
        <CardStub title="5. False-Positive Checks" status="UNVETTED" color="bg-surface text-muted" />
        <CardStub title="6. Astronomer's Notes" status="UNVETTED" color="bg-surface text-muted" />
        <CardStub title="7. Survey Classification" status="UNVETTED" color="bg-surface text-muted" />
      </div>

      <div className="bg-surface/50 border border-border text-subtle text-xs p-2.5 rounded text-center font-mono">
        Toggle each card to Trust or Reject • Evaluate all 7 items independently
      </div>
    </div>
  );
}

function CardStub({ title, status, color }: { title: string; status: string; color: string }) {
  return (
    <div className="bg-void p-2.5 rounded border border-border flex flex-col justify-between h-20">
      <div className="text-[10px] text-bright font-semibold leading-tight">{title}</div>
      <div className={`text-[9px] px-1.5 py-0.5 rounded text-center font-mono ${color}`}>{status}</div>
    </div>
  );
}

// NOTE: Scene11Visual reimplements the weighting table summary for the tutorial display.
// If ROUND_WEIGHTS in src/lib/scoring.ts or Results.tsx changes, update this table to match!
export function Scene11Visual({ activeLineIndex: _activeLineIndex }: { activeLineIndex?: number }) {
  return (
    <div className="w-full h-80 bg-panel rounded-xl border border-border p-5 flex flex-col justify-between">
      <div className="text-center">
        <h3 className="text-base font-bold text-bright">Final Report & Weighting Table</h3>
        <p className="text-xs text-subtle">Reasoning carries increasing weight as you advance through rounds</p>
      </div>

      <div className="overflow-x-auto my-2">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border text-muted uppercase">
              <th className="py-1.5 text-left">Round</th>
              <th className="py-1.5 text-center">Accuracy</th>
              <th className="py-1.5 text-center">Data Analysis</th>
              <th className="py-1.5 text-center text-warning font-bold">Reasoning</th>
              <th className="py-1.5 text-center">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-mono text-text">
            <tr>
              <td className="py-1 text-left">Round 1: Detection</td>
              <td className="text-center">50%</td>
              <td className="text-center">20%</td>
              <td className="text-center text-warning font-bold">20%</td>
              <td className="text-center">10%</td>
            </tr>
            <tr>
              <td className="py-1 text-left">Round 2: Validation</td>
              <td className="text-center">40%</td>
              <td className="text-center">20%</td>
              <td className="text-center text-warning font-bold">30%</td>
              <td className="text-center">10%</td>
            </tr>
            <tr>
              <td className="py-1 text-left">Round 3: Data Room</td>
              <td className="text-center">30%</td>
              <td className="text-center">40%</td>
              <td className="text-center text-warning font-bold">20%</td>
              <td className="text-center">10%</td>
            </tr>
            <tr className="bg-accent/10">
              <td className="py-1 text-left font-bold text-bright">Round 4: Confirmation</td>
              <td className="text-center">25%</td>
              <td className="text-center">30%</td>
              <td className="text-center text-warning font-bold">35%</td>
              <td className="text-center">10%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="text-center text-xs font-semibold text-accent bg-surface p-2.5 rounded border border-border">
        ✦ A right answer you can't justify will not win this.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Scene Router
// ---------------------------------------------------------------------------
export function TutorialSceneVisual({ sceneIndex, timeMs, activeLineIndex }: SceneVisualProps) {
  switch (sceneIndex) {
    case 0:
      return <Scene1Visual timeMs={timeMs} />;
    case 1:
      return <Scene2Visual timeMs={timeMs} />;
    case 2:
      return <Scene3Visual activeLineIndex={activeLineIndex} />;
    case 3:
      return <Scene4Visual activeLineIndex={activeLineIndex} />;
    case 4:
      return <Scene5Visual activeLineIndex={activeLineIndex} />;
    case 5:
      return <Scene6Visual activeLineIndex={activeLineIndex} />;
    case 6:
      return <Scene7Visual activeLineIndex={activeLineIndex} />;
    case 7:
      return <Scene8Visual activeLineIndex={activeLineIndex} />;
    case 8:
      return <Scene9Visual activeLineIndex={activeLineIndex} />;
    case 9:
      return <Scene10Visual activeLineIndex={activeLineIndex} />;
    case 10:
      return <Scene11Visual activeLineIndex={activeLineIndex} />;
    default:
      return <Scene1Visual timeMs={timeMs} />;
  }
}
