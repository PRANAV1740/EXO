/**
 * Minimal light curve canvas renderer for testing.
 * This will evolve into the full interactive LightCurveViewer.
 * For now: renders points with auto-scaled axes, axis labels, and grid.
 */

import { useRef, useEffect, useCallback } from 'react';
import type { Point } from '../lib/lightcurve';

interface MiniCurveRendererProps {
  points: Point[];
  width?: number;
  height?: number;
  className?: string;
  title?: string;
}

const MARGIN = { top: 30, right: 20, bottom: 40, left: 65 };

export function MiniCurveRenderer({
  points,
  width = 800,
  height = 280,
  className = '',
  title,
}: MiniCurveRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const plotW = width - MARGIN.left - MARGIN.right;
    const plotH = height - MARGIN.top - MARGIN.bottom;

    // Robust percentile bounds (0.5th to 99.5th percentile) to prevent spikes from compressing noise
    const sortedFlux = [...points].map((p) => p.flux).sort((a, b) => a - b);
    const p005Idx = Math.floor(sortedFlux.length * 0.005);
    const p995Idx = Math.min(sortedFlux.length - 1, Math.ceil(sortedFlux.length * 0.995));
    let fMin = sortedFlux[p005Idx] ?? sortedFlux[0];
    let fMax = sortedFlux[p995Idx] ?? sortedFlux[sortedFlux.length - 1];

    let tMin = Infinity, tMax = -Infinity;
    for (const p of points) {
      if (p.t < tMin) tMin = p.t;
      if (p.t > tMax) tMax = p.t;
    }
    const fRange = fMax - fMin || 0.01;
    const fPad = fRange * 0.08;
    fMin -= fPad;
    fMax += fPad;

    // Coordinate transforms
    const toX = (t: number) => MARGIN.left + ((t - tMin) / (tMax - tMin)) * plotW;
    const toY = (f: number) => MARGIN.top + ((fMax - f) / (fMax - fMin)) * plotH;

    // Clear
    ctx.fillStyle = '#0f1628';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(36, 48, 85, 0.6)';
    ctx.lineWidth = 0.5;
    const numGridX = 5;
    const numGridY = 3; // 4 clean ticks
    for (let i = 0; i <= numGridX; i++) {
      const x = MARGIN.left + (i / numGridX) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, MARGIN.top);
      ctx.lineTo(x, MARGIN.top + plotH);
      ctx.stroke();
    }
    for (let i = 0; i <= numGridY; i++) {
      const y = MARGIN.top + (i / numGridY) * plotH;
      ctx.beginPath();
      ctx.moveTo(MARGIN.left, y);
      ctx.lineTo(MARGIN.left + plotW, y);
      ctx.stroke();
    }

    // Plot border
    ctx.strokeStyle = '#243055';
    ctx.lineWidth = 1;
    ctx.strokeRect(MARGIN.left, MARGIN.top, plotW, plotH);

    // Data points (clipped to plot rectangle so outliers don't bleed out)
    ctx.save();
    ctx.beginPath();
    ctx.rect(MARGIN.left, MARGIN.top, plotW, plotH);
    ctx.clip();

    ctx.fillStyle = '#4f8ff7';
    for (const p of points) {
      const x = toX(p.t);
      const y = toY(p.flux);
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Axis labels
    ctx.fillStyle = '#6b7db0';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';

    // X axis labels
    for (let i = 0; i <= numGridX; i++) {
      const t = tMin + (i / numGridX) * (tMax - tMin);
      const x = MARGIN.left + (i / numGridX) * plotW;
      ctx.fillText(t.toFixed(1), x, MARGIN.top + plotH + 14);
    }

    // X axis title
    ctx.fillStyle = '#4a5580';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillText('Time (days)', MARGIN.left + plotW / 2, height - 4);

    // Y axis tick labels (3 decimals for clean spacing)
    ctx.fillStyle = '#6b7db0';
    ctx.textAlign = 'right';
    for (let i = 0; i <= numGridY; i++) {
      const f = fMax - (i / numGridY) * (fMax - fMin);
      const y = MARGIN.top + (i / numGridY) * plotH;
      ctx.fillText(f.toFixed(3), MARGIN.left - 5, y + 3);
    }

    // Y axis title (rotated)
    ctx.save();
    ctx.fillStyle = '#4a5580';
    ctx.translate(12, MARGIN.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Relative Flux', 0, 0);
    ctx.restore();

    // Title
    if (title) {
      ctx.fillStyle = '#c8d4f0';
      ctx.font = 'bold 13px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(title, MARGIN.left, MARGIN.top - 10);
    }
  }, [points, width, height, title]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className={`rounded-lg ${className}`}
    />
  );
}
