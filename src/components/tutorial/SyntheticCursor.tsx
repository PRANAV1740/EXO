/**
 * SyntheticCursor.tsx — Animated SVG cursor for tutorial walkthroughs.
 * Simulates clicks, drags, hover, and typing with glowing trail and pulse effects.
 */

import { useEffect, useState } from 'react';

interface SyntheticCursorProps {
  x: number; // pixel X inside container
  y: number; // pixel Y inside container
  visible?: boolean;
  clicking?: boolean;
  label?: string;
}

export function SyntheticCursor({
  x,
  y,
  visible = true,
  clicking = false,
  label,
}: SyntheticCursorProps) {
  const [isClicking, setIsClicking] = useState(clicking);

  useEffect(() => {
    setIsClicking(clicking);
  }, [clicking]);

  if (!visible) return null;

  return (
    <div
      className="absolute pointer-events-none z-40 transition-all duration-300 ease-out"
      style={{
        left: x,
        top: y,
        transform: 'translate(-8px, -8px)',
      }}
    >
      {/* Click ripple animation */}
      {isClicking && (
        <div className="absolute -inset-3 rounded-full border-2 border-accent animate-ping opacity-75" />
      )}

      {/* Outer glow */}
      <div className="w-5 h-5 rounded-full bg-accent/40 blur-sm animate-pulse" />

      {/* Main cursor dot */}
      <div className="absolute top-1 left-1 w-3 h-3 rounded-full bg-accent border-2 border-white shadow-lg shadow-accent/50 flex items-center justify-center">
        <div className="w-1 h-1 rounded-full bg-white" />
      </div>

      {/* Optional cursor label */}
      {label && (
        <div className="absolute left-5 top-0 bg-deep/90 border border-accent/50 text-accent text-[10px] font-mono px-2 py-0.5 rounded shadow-md whitespace-nowrap">
          {label}
        </div>
      )}
    </div>
  );
}
