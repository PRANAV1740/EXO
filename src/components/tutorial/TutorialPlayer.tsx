/**
 * TutorialPlayer.tsx — Interactive 11-scene tutorial player container.
 *
 * Controls:
 * - Play / Pause toggle
 * - Previous / Next buttons (Next glows when scene lines are complete)
 * - Scene position dots (1 to 11)
 * - Speed selector (0.75x, 1x, 1.25x)
 * - Skip button (always visible)
 * - Automatic hold at end of scene until player clicks Next
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TUTORIAL_SCENES } from '../../lib/tutorialScript';
import { NarrationPanel } from './NarrationPanel';
import { TutorialSceneVisual } from './TutorialScenes';

export function TutorialPlayer() {
  const navigate = useNavigate();

  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [timeMs, setTimeMs] = useState(0);
  const [speed, setSpeed] = useState<number>(1.0);

  const scene = TUTORIAL_SCENES[currentSceneIndex];
  const animationFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(performance.now());

  // Mark tutorial as complete in localStorage
  const completeTutorial = useCallback(() => {
    try {
      localStorage.setItem('exoplanet-watch-tutorial-done', 'true');
    } catch {
      // ignore
    }
  }, []);

  const handleSkip = useCallback(() => {
    completeTutorial();
    navigate('/how-to-play');
  }, [completeTutorial, navigate]);

  const handleNext = useCallback(() => {
    if (currentSceneIndex < TUTORIAL_SCENES.length - 1) {
      setCurrentSceneIndex((prev) => prev + 1);
      setTimeMs(0);
      setIsPlaying(true);
    } else {
      completeTutorial();
      navigate('/how-to-play');
    }
  }, [currentSceneIndex, completeTutorial, navigate]);

  const handlePrev = useCallback(() => {
    if (currentSceneIndex > 0) {
      setCurrentSceneIndex((prev) => prev - 1);
      setTimeMs(0);
      setIsPlaying(true);
    }
  }, [currentSceneIndex]);

  // Main animation / timer loop
  useEffect(() => {
    lastTickRef.current = performance.now();

    const tick = () => {
      const now = performance.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      if (isPlaying) {
        setTimeMs((prev) => {
          const nextTime = prev + delta * speed;
          // Check if scene duration reached
          if (nextTime >= scene.durationMs) {
            if (scene.holdAtEnd) {
              setIsPlaying(false); // Pause at end of scene
              return scene.durationMs;
            }
          }
          return nextTime;
        });
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, speed, scene]);

  // Are all narration lines currently displayed for this scene?
  const allLinesDisplayed = timeMs >= (scene.lines[scene.lines.length - 1]?.t ?? 0);
  const isHeldAtEnd = timeMs >= scene.durationMs && !isPlaying;

  // Compute active line index for animation cue anchoring
  const activeLineIndex = scene.lines.reduce((acc, line, idx) => {
    return timeMs >= line.t ? idx : acc;
  }, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-4 py-4 px-4">
      {/* Top Header info */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] text-accent uppercase tracking-widest block font-semibold">
            Interactive Walkthrough (7m 21s)
          </span>
          <h2 className="text-lg font-bold text-bright">
            {scene.title}
          </h2>
        </div>
        <button
          onClick={handleSkip}
          className="px-4 py-2 bg-surface border border-accent/60 text-accent font-semibold text-xs rounded-lg hover:bg-accent hover:text-white transition-all shadow-sm"
        >
          Skip Tutorial ✕
        </button>
      </div>

      {/* Main Visual Animation Box */}
      <TutorialSceneVisual sceneIndex={currentSceneIndex} timeMs={timeMs} activeLineIndex={activeLineIndex} />

      {/* Fixed Narration Panel */}
      <NarrationPanel lines={scene.lines} currentTimeMs={timeMs} />

      {/* Bottom Controls Bar */}
      <div className="bg-panel border border-border rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Play/Pause & Prev/Next */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentSceneIndex === 0}
            className="p-2 rounded-lg bg-surface border border-border text-text hover:border-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous Scene"
          >
            ⏮
          </button>

          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="px-4 py-2 rounded-lg bg-accent text-white font-semibold hover:bg-accent-glow transition-colors text-sm flex items-center gap-1.5"
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>

          <button
            onClick={handleNext}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-1 ${
              allLinesDisplayed || isHeldAtEnd
                ? 'bg-success text-white ring-2 ring-success/50 animate-pulse'
                : 'bg-surface border border-border text-text hover:border-accent'
            }`}
            title="Next Scene"
          >
            {currentSceneIndex === TUTORIAL_SCENES.length - 1 ? 'Finish →' : 'Next ⏭'}
          </button>
        </div>

        {/* Scene Dots */}
        <div className="flex items-center gap-1.5">
          {TUTORIAL_SCENES.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => {
                setCurrentSceneIndex(idx);
                setTimeMs(0);
                setIsPlaying(true);
              }}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                idx === currentSceneIndex
                  ? 'bg-accent w-6'
                  : idx < currentSceneIndex
                  ? 'bg-subtle'
                  : 'bg-border'
              }`}
              title={s.title}
            />
          ))}
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted uppercase tracking-wider font-mono">
            Speed:
          </span>
          {[0.75, 1.0, 1.25].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                speed === s
                  ? 'bg-accent text-white font-bold'
                  : 'bg-surface text-subtle border border-border hover:text-text'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
