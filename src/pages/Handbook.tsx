/**
 * Mission Handbook — Reference guide for astronomers.
 *
 * Sections:
 * 1. Exoplanets and Transit Method
 * 2. Reading Light Curves
 * 3. Transit Depth & Radius Ratio
 * 4. Orbital Period & Duration
 * 5. False Positives & The Odd/Even Test
 * 6. Glossary
 * 7. Interactive Practice Sandbox (sliders for depth, period, noise)
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateCurve } from '../lib/lightcurve';
import { LightCurveViewer } from '../components/LightCurveViewer';
import { MiniCurveRenderer } from '../components/MiniCurveRenderer';

export default function Handbook() {
  const navigate = useNavigate();

  // Interactive Sandbox state
  const [sandboxDepth, setSandboxDepth] = useState(0.015); // 1.5%
  const [sandboxPeriod, setSandboxPeriod] = useState(4.0); // 4 days
  const [sandboxNoise, setSandboxNoise] = useState(0.003);

  // Generate sandbox curve dynamically
  const sandboxPoints = useMemo(() => {
    // Generate synthetic points based on sandbox parameters
    const totalDays = 20;
    const numPoints = 800;
    const points = [];
    const durationDays = 3.0 / 24; // 3 hours
    const epoch = 2.0;

    for (let i = 0; i < numPoints; i++) {
      const t = (i / (numPoints - 1)) * totalDays;
      let flux = 1.0;

      // Repeat transits
      for (let n = 0; n * sandboxPeriod + epoch < totalDays; n++) {
        const tc = n * sandboxPeriod + epoch;
        const dt = Math.abs(t - tc);
        if (dt <= durationDays / 2) {
          // Soft box dip
          const ramp = 0.15 * durationDays;
          if (dt <= durationDays / 2 - ramp) {
            flux -= sandboxDepth;
          } else {
            const progress = (durationDays / 2 - dt) / ramp;
            flux -= sandboxDepth * progress;
          }
        }
      }

      // Add noise using simple deterministic hash pseudo-random
      const hash = Math.sin(i * 12.9898 + t * 78.233) * 43758.5453;
      const pseudoNoise = (hash - Math.floor(hash) - 0.5) * 2 * sandboxNoise;
      flux += pseudoNoise;

      points.push({ t, flux });
    }
    return points;
  }, [sandboxDepth, sandboxPeriod, sandboxNoise]);

  // Sample curves for False Positives section
  const sampleEB = useMemo(() => generateCurve('eclipsingBinary', 777, 'medium'), []);
  const sampleVar = useMemo(() => generateCurve('stellarVariability', 888, 'medium'), []);

  return (
    <div className="min-h-screen bg-void py-8 px-6">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <div className="border-b border-border pb-6 flex items-center justify-between">
          <div>
            <span className="text-xs text-accent font-semibold uppercase tracking-wider block mb-1">
              Field Guide & Reference
            </span>
            <h1 className="text-3xl font-bold text-bright">
              Mission Handbook
            </h1>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-surface border border-border text-subtle text-sm rounded-lg hover:text-text hover:border-accent transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* Section 1: Exoplanets and the Transit Method */}
        <section className="bg-panel border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-bright flex items-center gap-2">
            <span>🪐</span> 1. Exoplanets & The Transit Method
          </h2>
          <p className="text-sm text-subtle leading-relaxed">
            An <strong className="text-text">exoplanet</strong> is a planet orbiting a star outside our solar system. Because exoplanets are far too faint to image directly, we use photometric monitoring: observing a star's brightness continuously over time.
          </p>
          <p className="text-sm text-subtle leading-relaxed">
            When an exoplanet's orbit is aligned edge-on relative to Earth, it passes directly between its host star and our telescope once per orbit. This event is called a <strong className="text-text">transit</strong>. During transit, the planet blocks a small portion of the star's disk, causing a temporary dip in measured flux.
          </p>
        </section>

        {/* Section 2: Reading a Light Curve */}
        <section className="bg-panel border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-bright flex items-center gap-2">
            <span>📈</span> 2. Reading a Light Curve
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-subtle">
            <div>
              <h3 className="font-semibold text-text mb-2">Axes & Definitions</h3>
              <ul className="list-disc list-inside space-y-1.5 text-xs">
                <li><strong className="text-bright">X-Axis (Time):</strong> Measured in days. Shows continuous observation span (typically 20–40 days).</li>
                <li><strong className="text-bright">Y-Axis (Relative Flux):</strong> Standardised brightness of the star. Out-of-transit flux is normalized to <span className="font-mono text-accent">1.0</span>.</li>
                <li><strong className="text-bright">Baseline:</strong> The steady un-occulted brightness of the host star.</li>
                <li><strong className="text-bright">Dip:</strong> A sudden drop below 1.0 indicating occultation or noise.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-text mb-2">Key Measurement Tools</h3>
              <ul className="list-disc list-inside space-y-1.5 text-xs">
                <li><strong className="text-bright">Dip Markers:</strong> Double-click to mark transit midpoints and track period rhythm.</li>
                <li><strong className="text-bright">Horizontal Lines:</strong> Drag to measure out-of-transit baseline vs in-transit bottom.</li>
                <li><strong className="text-bright">Vertical Markers:</strong> Drag to bracket transit start and end (ingress & egress).</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 3: Transit Depth & Radius Ratio */}
        <section className="bg-panel border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-bright flex items-center gap-2">
            <span>📐</span> 3. Transit Depth & Planet Radius Formula
          </h2>
          <p className="text-sm text-subtle leading-relaxed">
            The fraction of starlight blocked equals the ratio of the planet's cross-sectional area to the star's cross-sectional area:
          </p>
          <div className="bg-surface/80 p-4 rounded-lg border border-border font-mono text-sm text-center space-y-2">
            <div>Depth = (R<sub>p</sub> / R<sub>s</sub>)<sup>2</sup></div>
            <div className="text-accent font-semibold">R<sub>p</sub> / R<sub>s</sub> = √Depth</div>
            <div className="text-xs text-muted">
              R<sub>p</sub>(Earth radii) = (R<sub>p</sub> / R<sub>s</sub>) × R<sub>star</sub>(solar) × 109.2
            </div>
          </div>

          <div className="bg-surface/40 p-4 rounded-lg border border-border text-xs text-subtle space-y-2">
            <h4 className="font-semibold text-text uppercase tracking-wider">Worked Example:</h4>
            <p>
              Suppose a star drops from <span className="font-mono text-text">1.000</span> baseline flux to <span className="font-mono text-text">0.990</span> during transit.
            </p>
            <ul className="list-disc list-inside space-y-1 font-mono text-bright">
              <li>Depth = 1.000 - 0.990 = 0.01 (1.0%)</li>
              <li>R<sub>p</sub> / R<sub>s</sub> = √0.01 = 0.10</li>
              <li>If R<sub>star</sub> = 1.0 R<sub>☉</sub> (Sun-sized star):</li>
              <li>R<sub>p</sub> = 0.10 × 1.0 × 109.2 = <strong>10.92 R<sub>⊕</sub></strong> (Jupiter-class gas giant)</li>
            </ul>
          </div>
        </section>

        {/* Section 4: False Positives & The Odd/Even Test */}
        <section className="bg-panel border border-border rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-bold text-bright flex items-center gap-2">
            <span>🚨</span> 4. False Positives & The Odd/Even Test
          </h2>

          <div className="space-y-4 text-sm text-subtle">
            <h3 className="font-semibold text-text text-base">The Odd/Even Test (Crucial Skill)</h3>
            <p className="leading-relaxed">
              An <strong>eclipsing binary (EB)</strong> system consists of two stars orbiting a common center of mass. As the secondary star passes in front of the primary star (primary eclipse), a deep dip occurs. When the primary star passes in front of the secondary star (secondary eclipse), a slightly shallower dip occurs.
            </p>
            <p className="leading-relaxed">
              If an astronomer misinterprets the orbital period as half its true value, they will treat every eclipse as identical. Careful inspection reveals that <strong>odd-numbered dips are 10–20% deeper than even-numbered dips</strong>! If odd/even depths alternate, it is an Eclipsing Binary, NOT an exoplanet.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-surface p-3 rounded-lg border border-border">
                <div className="text-xs font-semibold text-bright mb-1">Eclipsing Binary Example</div>
                <div className="text-xs text-muted mb-2">Deep V-shape & subtle odd/even depth alternation</div>
                <MiniCurveRenderer points={sampleEB.points} width={400} height={150} />
              </div>
              <div className="bg-surface p-3 rounded-lg border border-border">
                <div className="text-xs font-semibold text-bright mb-1">Stellar Variability Example</div>
                <div className="text-xs text-muted mb-2">Smooth continuous wandering without sharp ingress/egress</div>
                <MiniCurveRenderer points={sampleVar.points} width={400} height={150} />
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Glossary */}
        <section className="bg-panel border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-bright flex items-center gap-2">
            <span>📚</span> 5. Glossary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-surface p-3 rounded border border-border">
              <span className="text-accent font-bold block mb-1">Flux</span>
              Normalized stellar brightness. Out-of-transit baseline is 1.0.
            </div>
            <div className="bg-surface p-3 rounded border border-border">
              <span className="text-accent font-bold block mb-1">Ingress / Egress</span>
              The entering (ingress) and exiting (egress) phases of a transit dip.
            </div>
            <div className="bg-surface p-3 rounded border border-border">
              <span className="text-accent font-bold block mb-1">Centroid Shift</span>
              Apparent spatial motion of light center during transit, indicating a background star contaminant.
            </div>
            <div className="bg-surface p-3 rounded border border-border">
              <span className="text-accent font-bold block mb-1">Orbital Period (P)</span>
              Time interval between consecutive transits of the same orbiting body.
            </div>
          </div>
        </section>

        {/* Section 6: Interactive Practice Sandbox */}
        <section className="bg-panel border border-accent/40 rounded-xl p-6 space-y-6">
          <div>
            <span className="text-xs text-accent font-semibold uppercase tracking-wider block mb-1">
              Interactive Practice
            </span>
            <h2 className="text-xl font-bold text-bright flex items-center gap-2">
              <span>🧪</span> Light Curve Practice Sandbox
            </h2>
            <p className="text-xs text-subtle mt-1">
              Adjust parameters below to see how depth, orbital period, and instrument noise transform the light curve shape in real time.
            </p>
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-surface p-4 rounded-lg border border-border">
            <div>
              <div className="flex justify-between text-xs text-muted mb-1 font-mono">
                <span>Depth:</span>
                <span className="text-accent">{(sandboxDepth * 100).toFixed(2)}%</span>
              </div>
              <input
                type="range"
                min={0.002}
                max={0.05}
                step={0.001}
                value={sandboxDepth}
                onChange={(e) => setSandboxDepth(parseFloat(e.target.value))}
                className="w-full accent-accent cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-muted mb-1 font-mono">
                <span>Period:</span>
                <span className="text-accent">{sandboxPeriod.toFixed(1)} days</span>
              </div>
              <input
                type="range"
                min={1.5}
                max={8.0}
                step={0.5}
                value={sandboxPeriod}
                onChange={(e) => setSandboxPeriod(parseFloat(e.target.value))}
                className="w-full accent-accent cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-muted mb-1 font-mono">
                <span>Noise σ:</span>
                <span className="text-accent">{(sandboxNoise * 100).toFixed(2)}%</span>
              </div>
              <input
                type="range"
                min={0.0005}
                max={0.015}
                step={0.0005}
                value={sandboxNoise}
                onChange={(e) => setSandboxNoise(parseFloat(e.target.value))}
                className="w-full accent-accent cursor-pointer"
              />
            </div>
          </div>

          {/* Interactive Plot */}
          <div className="flex justify-center bg-deep p-4 rounded-lg border border-border">
            <LightCurveViewer
              points={sandboxPoints}
              width={820}
              height={300}
              enableDipMarkers={true}
              enableVerticalMarkers={true}
              enableHorizontalLines={true}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
