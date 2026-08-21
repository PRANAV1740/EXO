/**
 * LightCurveViewer — the core interactive plot component.
 *
 * Features:
 * - Auto-scaled flux axis with ~5% padding
 * - Pan (click-drag) and zoom (scroll = time axis, shift+scroll = flux axis)
 * - Click-to-mark: click places dip markers, click marker to remove
 * - Draggable vertical markers: bracket transit start/end
 * - Draggable horizontal lines: baseline and in-transit flux levels
 * - Real-time readout panel
 * - Reset view button
 *
 * All coordinates use exact pixel-to-data mapping — no charting library.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Point } from '../lib/lightcurve';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DipMarker {
  id: string;
  t: number; // time in days
}

export interface VerticalMarkerPair {
  start: number | null; // time
  end: number | null; // time
}

export interface HorizontalLines {
  baseline: number | null; // flux
  transitLevel: number | null; // flux
}

export interface ViewerState {
  dipMarkers: DipMarker[];
  verticalMarkers: VerticalMarkerPair;
  horizontalLines: HorizontalLines;
}

interface LightCurveViewerProps {
  points: Point[];
  width?: number;
  height?: number;
  className?: string;
  // Interaction modes
  enableDipMarkers?: boolean;
  enableVerticalMarkers?: boolean;
  enableHorizontalLines?: boolean;
  // Initial view window span in days (e.g. 5.0 for zoomed initial view where transit >= 5% width)
  initialViewWindowDays?: number;
  // Callbacks
  onStateChange?: (state: ViewerState) => void;
  // Initial state
  initialState?: Partial<ViewerState>;
  // Read-only mode
  readOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MARGIN = { top: 20, right: 20, bottom: 45, left: 70 };
const MARKER_HIT_RADIUS = 8; // pixels
const LINE_HIT_RADIUS = 6; // pixels
const DIP_MARKER_RADIUS = 5;
const ZOOM_FACTOR = 0.1;
const MIN_ZOOM_RANGE_T = 0.5; // minimum 0.5 days visible
const MIN_ZOOM_RANGE_F = 0.0001; // minimum flux range

// Colors
const COLORS = {
  bg: '#0f1628',
  grid: 'rgba(36, 48, 85, 0.5)',
  border: '#243055',
  point: '#4f8ff7',
  pointHover: '#6ba3ff',
  dipMarker: '#ff6b4a',
  dipMarkerHover: '#ff8a6a',
  verticalMarker: '#c084fc',
  baseline: '#50e88a',
  transitLevel: '#f0c040',
  axisLabel: '#6b7db0',
  axisTitle: '#4a5580',
  text: '#c8d4f0',
  crosshair: 'rgba(200, 212, 240, 0.15)',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LightCurveViewer({
  points,
  width = 900,
  height = 350,
  className = '',
  enableDipMarkers = true,
  enableVerticalMarkers = true,
  enableHorizontalLines = true,
  initialViewWindowDays,
  onStateChange,
  initialState,
  readOnly = false,
}: LightCurveViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // View bounds (what's visible)
  const [viewTMin, setViewTMin] = useState<number | null>(null);
  const [viewTMax, setViewTMax] = useState<number | null>(null);
  const [viewFMin, setViewFMin] = useState<number | null>(null);
  const [viewFMax, setViewFMax] = useState<number | null>(null);

  // Data bounds (full extent)
  const dataBoundsRef = useRef({ tMin: 0, tMax: 1, fMin: 0.99, fMax: 1.01 });

  // Interaction state
  const [dipMarkers, setDipMarkers] = useState<DipMarker[]>(
    initialState?.dipMarkers || []
  );
  const [verticalMarkers, setVerticalMarkers] = useState<VerticalMarkerPair>(
    initialState?.verticalMarkers || { start: null, end: null }
  );
  const [horizontalLines, setHorizontalLines] = useState<HorizontalLines>(
    initialState?.horizontalLines || { baseline: null, transitLevel: null }
  );

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<
    'pan' | 'vertStart' | 'vertEnd' | 'baseline' | 'transitLevel' | null
  >(null);
  const dragStartRef = useRef({ x: 0, y: 0, tMin: 0, tMax: 0, fMin: 0, fMax: 0 });

  // Mouse position for crosshair
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [mouseData, setMouseData] = useState<{ t: number; flux: number } | null>(null);

  // Compute data bounds using percentile limits (0.5th to 99.5th) to protect against outlier spikes
  useEffect(() => {
    if (points.length === 0) return;

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

    dataBoundsRef.current = { tMin, tMax, fMin, fMax };

    // Set initial view with initialViewWindowDays zoom if specified
    if (viewTMin === null) {
      const initialSpan = initialViewWindowDays ?? (tMax - tMin);
      setViewTMin(tMin);
      setViewTMax(Math.min(tMax, tMin + initialSpan));
      setViewFMin(fMin);
      setViewFMax(fMax);
    }
  }, [points, initialViewWindowDays]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.({ dipMarkers, verticalMarkers, horizontalLines });
  }, [dipMarkers, verticalMarkers, horizontalLines, onStateChange]);

  // Coordinate transforms
  const plotW = width - MARGIN.left - MARGIN.right;
  const plotH = height - MARGIN.top - MARGIN.bottom;

  const toX = useCallback(
    (t: number) => {
      const tMin = viewTMin ?? 0;
      const tMax = viewTMax ?? 1;
      return MARGIN.left + ((t - tMin) / (tMax - tMin)) * plotW;
    },
    [viewTMin, viewTMax, plotW]
  );

  const toY = useCallback(
    (f: number) => {
      const fMin = viewFMin ?? 0;
      const fMax = viewFMax ?? 1;
      return MARGIN.top + ((fMax - f) / (fMax - fMin)) * plotH;
    },
    [viewFMin, viewFMax, plotH]
  );

  const toT = useCallback(
    (x: number) => {
      const tMin = viewTMin ?? 0;
      const tMax = viewTMax ?? 1;
      return tMin + ((x - MARGIN.left) / plotW) * (tMax - tMin);
    },
    [viewTMin, viewTMax, plotW]
  );

  const toF = useCallback(
    (y: number) => {
      const fMin = viewFMin ?? 0;
      const fMax = viewFMax ?? 1;
      return fMax - ((y - MARGIN.top) / plotH) * (fMax - fMin);
    },
    [viewFMin, viewFMax, plotH]
  );

  // Reset view to initial zoomed bounds
  const resetView = useCallback(() => {
    const { tMin, tMax, fMin, fMax } = dataBoundsRef.current;
    const initialSpan = initialViewWindowDays ?? (tMax - tMin);
    setViewTMin(tMin);
    setViewTMax(Math.min(tMax, tMin + initialSpan));
    setViewFMin(fMin);
    setViewFMax(fMax);
  }, [initialViewWindowDays]);

  const isFullView = useMemo(() => {
    if (viewTMin === null || viewTMax === null) return true;
    const { tMin, tMax } = dataBoundsRef.current;
    return Math.abs(viewTMin - tMin) < 0.2 && Math.abs(viewTMax - tMax) < 0.2;
  }, [viewTMin, viewTMax]);

  // ---------------------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------------------

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || viewTMin === null || viewTMax === null || viewFMin === null || viewFMax === null) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    const numGridX = 8;
    const numGridY = 6;

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
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(MARGIN.left, MARGIN.top, plotW, plotH);

    // Clip to plot area for data rendering
    ctx.save();
    ctx.beginPath();
    ctx.rect(MARGIN.left, MARGIN.top, plotW, plotH);
    ctx.clip();

    // --- Horizontal lines ---
    if (horizontalLines.baseline !== null) {
      const y = toY(horizontalLines.baseline);
      ctx.strokeStyle = COLORS.baseline;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(MARGIN.left, y);
      ctx.lineTo(MARGIN.left + plotW, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = COLORS.baseline;
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Baseline: ${horizontalLines.baseline.toFixed(5)}`, MARGIN.left + 5, y - 5);
    }

    if (horizontalLines.transitLevel !== null) {
      const y = toY(horizontalLines.transitLevel);
      ctx.strokeStyle = COLORS.transitLevel;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(MARGIN.left, y);
      ctx.lineTo(MARGIN.left + plotW, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = COLORS.transitLevel;
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Transit: ${horizontalLines.transitLevel.toFixed(5)}`, MARGIN.left + 5, y + 12);
    }

    // Depth shading between lines
    if (horizontalLines.baseline !== null && horizontalLines.transitLevel !== null) {
      const y1 = toY(horizontalLines.baseline);
      const y2 = toY(horizontalLines.transitLevel);
      ctx.fillStyle = 'rgba(240, 192, 64, 0.08)';
      ctx.fillRect(MARGIN.left, Math.min(y1, y2), plotW, Math.abs(y2 - y1));
    }

    // --- Vertical markers ---
    if (verticalMarkers.start !== null) {
      const x = toX(verticalMarkers.start);
      ctx.strokeStyle = COLORS.verticalMarker;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(x, MARGIN.top);
      ctx.lineTo(x, MARGIN.top + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = COLORS.verticalMarker;
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`T₁: ${verticalMarkers.start.toFixed(3)}d`, x, MARGIN.top + plotH + 12);
    }

    if (verticalMarkers.end !== null) {
      const x = toX(verticalMarkers.end);
      ctx.strokeStyle = COLORS.verticalMarker;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(x, MARGIN.top);
      ctx.lineTo(x, MARGIN.top + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = COLORS.verticalMarker;
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`T₂: ${verticalMarkers.end.toFixed(3)}d`, x, MARGIN.top + plotH + 12);
    }

    // Shading between vertical markers
    if (verticalMarkers.start !== null && verticalMarkers.end !== null) {
      const x1 = toX(verticalMarkers.start);
      const x2 = toX(verticalMarkers.end);
      ctx.fillStyle = 'rgba(192, 132, 252, 0.06)';
      ctx.fillRect(Math.min(x1, x2), MARGIN.top, Math.abs(x2 - x1), plotH);
    }

    // --- Data points ---
    ctx.fillStyle = COLORS.point;
    for (const p of points) {
      const x = toX(p.t);
      const y = toY(p.flux);
      // Only draw visible points
      if (x >= MARGIN.left - 2 && x <= MARGIN.left + plotW + 2) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // --- Dip markers ---
    for (const marker of dipMarkers) {
      const x = toX(marker.t);
      // Find nearest point for y position
      let nearestY = MARGIN.top + plotH / 2;
      let minDist = Infinity;
      for (const p of points) {
        const dist = Math.abs(p.t - marker.t);
        if (dist < minDist) {
          minDist = dist;
          nearestY = toY(p.flux);
        }
      }

      // Draw marker
      ctx.fillStyle = COLORS.dipMarker;
      ctx.strokeStyle = COLORS.dipMarker;
      ctx.lineWidth = 1.5;

      // Vertical line from marker to bottom
      ctx.beginPath();
      ctx.moveTo(x, nearestY - DIP_MARKER_RADIUS - 2);
      ctx.lineTo(x, MARGIN.top + plotH);
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Triangle marker pointing down
      ctx.beginPath();
      ctx.moveTo(x, nearestY - 2);
      ctx.lineTo(x - DIP_MARKER_RADIUS, nearestY - DIP_MARKER_RADIUS * 2 - 2);
      ctx.lineTo(x + DIP_MARKER_RADIUS, nearestY - DIP_MARKER_RADIUS * 2 - 2);
      ctx.closePath();
      ctx.fill();
    }

    // --- Crosshair ---
    if (mousePos && !isDragging) {
      const { x, y } = mousePos;
      if (x >= MARGIN.left && x <= MARGIN.left + plotW && y >= MARGIN.top && y <= MARGIN.top + plotH) {
        ctx.strokeStyle = COLORS.crosshair;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x, MARGIN.top);
        ctx.lineTo(x, MARGIN.top + plotH);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(MARGIN.left, y);
        ctx.lineTo(MARGIN.left + plotW, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    ctx.restore(); // Remove clip

    // --- Axis labels ---
    ctx.fillStyle = COLORS.axisLabel;
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';

    // X axis tick labels
    for (let i = 0; i <= numGridX; i++) {
      const t = viewTMin + (i / numGridX) * (viewTMax - viewTMin);
      const x = MARGIN.left + (i / numGridX) * plotW;
      ctx.fillText(t.toFixed(1), x, MARGIN.top + plotH + 15);
    }

    // X axis title
    ctx.fillStyle = COLORS.axisTitle;
    ctx.fillText('Time (days)', MARGIN.left + plotW / 2, height - 5);

    // Y axis tick labels
    ctx.fillStyle = COLORS.axisLabel;
    ctx.textAlign = 'right';
    for (let i = 0; i <= numGridY; i++) {
      const f = viewFMax - (i / numGridY) * (viewFMax - viewFMin);
      const y = MARGIN.top + (i / numGridY) * plotH;
      ctx.fillText(f.toFixed(4), MARGIN.left - 5, y + 4);
    }

    // Y axis title
    ctx.save();
    ctx.fillStyle = COLORS.axisTitle;
    ctx.translate(12, MARGIN.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.fillText('Relative Flux', 0, 0);
    ctx.restore();
  }, [
    points, width, height, plotW, plotH,
    viewTMin, viewTMax, viewFMin, viewFMax,
    toX, toY, dipMarkers, verticalMarkers, horizontalLines,
    mousePos, isDragging,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  // ---------------------------------------------------------------------------
  // Hit testing
  // ---------------------------------------------------------------------------

  const getCanvasPos = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const isInPlotArea = useCallback((x: number, y: number) => {
    return (
      x >= MARGIN.left && x <= MARGIN.left + plotW &&
      y >= MARGIN.top && y <= MARGIN.top + plotH
    );
  }, [plotW, plotH]);

  const hitTestDipMarker = useCallback(
    (x: number, _y: number): string | null => {
      for (const marker of dipMarkers) {
        const mx = toX(marker.t);
        if (Math.abs(x - mx) < MARKER_HIT_RADIUS) return marker.id;
      }
      return null;
    },
    [dipMarkers, toX]
  );

  const hitTestVerticalMarker = useCallback(
    (x: number): 'vertStart' | 'vertEnd' | null => {
      if (verticalMarkers.start !== null) {
        const mx = toX(verticalMarkers.start);
        if (Math.abs(x - mx) < LINE_HIT_RADIUS) return 'vertStart';
      }
      if (verticalMarkers.end !== null) {
        const mx = toX(verticalMarkers.end);
        if (Math.abs(x - mx) < LINE_HIT_RADIUS) return 'vertEnd';
      }
      return null;
    },
    [verticalMarkers, toX]
  );

  const hitTestHorizontalLine = useCallback(
    (y: number): 'baseline' | 'transitLevel' | null => {
      if (horizontalLines.baseline !== null) {
        const my = toY(horizontalLines.baseline);
        if (Math.abs(y - my) < LINE_HIT_RADIUS) return 'baseline';
      }
      if (horizontalLines.transitLevel !== null) {
        const my = toY(horizontalLines.transitLevel);
        if (Math.abs(y - my) < LINE_HIT_RADIUS) return 'transitLevel';
      }
      return null;
    },
    [horizontalLines, toY]
  );

  // ---------------------------------------------------------------------------
  // Mouse handlers
  // ---------------------------------------------------------------------------

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (readOnly) return;
      e.preventDefault();
      const { x, y } = getCanvasPos(e);
      if (!isInPlotArea(x, y)) return;

      // Check for drag targets (vertical markers, horizontal lines)
      if (enableVerticalMarkers) {
        const vHit = hitTestVerticalMarker(x);
        if (vHit) {
          setIsDragging(true);
          setDragType(vHit);
          return;
        }
      }

      if (enableHorizontalLines) {
        const hHit = hitTestHorizontalLine(y);
        if (hHit) {
          setIsDragging(true);
          setDragType(hHit);
          return;
        }
      }

      // Check for dip marker removal
      if (enableDipMarkers) {
        const dipHit = hitTestDipMarker(x, y);
        if (dipHit) {
          setDipMarkers((prev) => prev.filter((m) => m.id !== dipHit));
          return;
        }
      }

      // Start pan
      setIsDragging(true);
      setDragType('pan');
      dragStartRef.current = {
        x, y,
        tMin: viewTMin ?? 0,
        tMax: viewTMax ?? 1,
        fMin: viewFMin ?? 0,
        fMax: viewFMax ?? 1,
      };
    },
    [readOnly, getCanvasPos, isInPlotArea, enableVerticalMarkers, enableHorizontalLines, enableDipMarkers, hitTestVerticalMarker, hitTestHorizontalLine, hitTestDipMarker, viewTMin, viewTMax, viewFMin, viewFMax]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const { x, y } = getCanvasPos(e);
      setMousePos({ x, y });

      if (isInPlotArea(x, y)) {
        setMouseData({ t: toT(x), flux: toF(y) });
      } else {
        setMouseData(null);
      }

      if (!isDragging || readOnly) return;

      if (dragType === 'pan') {
        const dx = x - dragStartRef.current.x;
        const dy = y - dragStartRef.current.y;
        const { tMin, tMax, fMin, fMax } = dragStartRef.current;
        const tRange = tMax - tMin;
        const fRange = fMax - fMin;
        const dtPan = -(dx / plotW) * tRange;
        const dfPan = (dy / plotH) * fRange;

        setViewTMin(tMin + dtPan);
        setViewTMax(tMax + dtPan);
        setViewFMin(fMin + dfPan);
        setViewFMax(fMax + dfPan);
      } else if (dragType === 'vertStart') {
        setVerticalMarkers((prev) => ({ ...prev, start: toT(x) }));
      } else if (dragType === 'vertEnd') {
        setVerticalMarkers((prev) => ({ ...prev, end: toT(x) }));
      } else if (dragType === 'baseline') {
        setHorizontalLines((prev) => ({ ...prev, baseline: toF(y) }));
      } else if (dragType === 'transitLevel') {
        setHorizontalLines((prev) => ({ ...prev, transitLevel: toF(y) }));
      }
    },
    [getCanvasPos, isInPlotArea, isDragging, readOnly, dragType, toT, toF, plotW, plotH]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragType(null);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (readOnly || isDragging) return;
      const { x, y } = getCanvasPos(e);
      if (!isInPlotArea(x, y)) return;

      // Don't place markers if we just finished a drag
      // (handled by the mouseDown/mouseUp flow)
    },
    [readOnly, isDragging, getCanvasPos, isInPlotArea]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (readOnly) return;
      e.preventDefault();
      const { x, y } = getCanvasPos(e);
      if (!isInPlotArea(x, y)) return;

      const t = toT(x);
      const f = toF(y);

      // Shift+double-click: place/move horizontal lines
      if (e.shiftKey && enableHorizontalLines) {
        if (horizontalLines.baseline === null) {
          setHorizontalLines((prev) => ({ ...prev, baseline: f }));
        } else if (horizontalLines.transitLevel === null) {
          setHorizontalLines((prev) => ({ ...prev, transitLevel: f }));
        } else {
          // Move the nearest one
          const dBase = Math.abs(toY(horizontalLines.baseline) - y);
          const dTrans = Math.abs(toY(horizontalLines.transitLevel) - y);
          if (dBase < dTrans) {
            setHorizontalLines((prev) => ({ ...prev, baseline: f }));
          } else {
            setHorizontalLines((prev) => ({ ...prev, transitLevel: f }));
          }
        }
        return;
      }

      // Ctrl+double-click: place/move vertical markers
      if (e.ctrlKey && enableVerticalMarkers) {
        if (verticalMarkers.start === null) {
          setVerticalMarkers((prev) => ({ ...prev, start: t }));
        } else if (verticalMarkers.end === null) {
          setVerticalMarkers((prev) => ({ ...prev, end: t }));
        } else {
          // Move the nearest one
          const dStart = Math.abs(toX(verticalMarkers.start) - x);
          const dEnd = Math.abs(toX(verticalMarkers.end) - x);
          if (dStart < dEnd) {
            setVerticalMarkers((prev) => ({ ...prev, start: t }));
          } else {
            setVerticalMarkers((prev) => ({ ...prev, end: t }));
          }
        }
        return;
      }

      // Normal double-click: dip marker
      if (enableDipMarkers) {
        // Check if clicking an existing marker to remove
        const hit = hitTestDipMarker(x, y);
        if (hit) {
          setDipMarkers((prev) => prev.filter((m) => m.id !== hit));
        } else {
          setDipMarkers((prev) => [
            ...prev,
            { id: `dip-${Date.now()}-${Math.floor(t * 1000)}`, t },
          ]);
        }
      }
    },
    [
      readOnly, getCanvasPos, isInPlotArea, toT, toF, toX, toY,
      enableDipMarkers, enableVerticalMarkers, enableHorizontalLines,
      horizontalLines, verticalMarkers, hitTestDipMarker,
    ]
  );

  // Zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (viewTMin === null || viewTMax === null || viewFMin === null || viewFMax === null) return;

      const { x, y } = getCanvasPos(e);
      if (!isInPlotArea(x, y)) return;

      const direction = e.deltaY > 0 ? 1 : -1;
      const factor = direction * ZOOM_FACTOR;

      if (e.shiftKey) {
        // Zoom flux axis
        const fRange = viewFMax - viewFMin;
        const fCenter = toF(y);
        const newRange = Math.max(fRange * (1 + factor), MIN_ZOOM_RANGE_F);
        const ratio = (fCenter - viewFMin) / fRange;
        setViewFMin(fCenter - newRange * ratio);
        setViewFMax(fCenter + newRange * (1 - ratio));
      } else {
        // Zoom time axis
        const tRange = viewTMax - viewTMin;
        const tCenter = toT(x);
        const newRange = Math.max(tRange * (1 + factor), MIN_ZOOM_RANGE_T);
        const ratio = (tCenter - viewTMin) / tRange;
        setViewTMin(tCenter - newRange * ratio);
        setViewTMax(tCenter + newRange * (1 - ratio));
      }
    },
    [viewTMin, viewTMax, viewFMin, viewFMax, getCanvasPos, isInPlotArea, toT, toF]
  );

  // Cursor style
  const getCursor = useCallback(
    (x: number, y: number): string => {
      if (readOnly) return 'default';
      if (isDragging) {
        if (dragType === 'pan') return 'grabbing';
        if (dragType === 'vertStart' || dragType === 'vertEnd') return 'col-resize';
        if (dragType === 'baseline' || dragType === 'transitLevel') return 'row-resize';
      }
      if (isInPlotArea(x, y)) {
        if (enableVerticalMarkers && hitTestVerticalMarker(x)) return 'col-resize';
        if (enableHorizontalLines && hitTestHorizontalLine(y)) return 'row-resize';
        if (enableDipMarkers && hitTestDipMarker(x, y)) return 'pointer';
        return 'crosshair';
      }
      return 'default';
    },
    [readOnly, isDragging, dragType, isInPlotArea, enableVerticalMarkers, enableHorizontalLines, enableDipMarkers, hitTestVerticalMarker, hitTestHorizontalLine, hitTestDipMarker]
  );

  // Computed depth
  const computedDepth =
    horizontalLines.baseline !== null && horizontalLines.transitLevel !== null
      ? Math.abs(horizontalLines.baseline - horizontalLines.transitLevel)
      : null;

  const computedPeriod =
    verticalMarkers.start !== null && verticalMarkers.end !== null
      ? Math.abs(verticalMarkers.end - verticalMarkers.start)
      : null;

  const setPresetWindow = useCallback((days: number) => {
    const { tMin, tMax, fMin, fMax } = dataBoundsRef.current;
    setViewTMin(tMin);
    setViewTMax(Math.min(tMax, tMin + days));
    setViewFMin(fMin);
    setViewFMax(fMax);
  }, []);

  return (
    <div ref={containerRef} className={`inline-block ${className}`}>
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 px-1">
          <div className="flex items-center gap-3 text-xs text-muted">
            <span>Double-click: dip marker</span>
            <span>Ctrl+dbl: vertical markers</span>
            <span>Shift+dbl: horizontal lines</span>
            <span>Scroll: zoom • Drag: pan</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Preset View Buttons */}
            <div className="flex items-center gap-1 bg-surface p-0.5 rounded border border-border">
              <button
                onClick={() => {
                  const { tMin, tMax, fMin, fMax } = dataBoundsRef.current;
                  setViewTMin(tMin);
                  setViewTMax(tMax);
                  setViewFMin(fMin);
                  setViewFMax(fMax);
                }}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  isFullView
                    ? 'bg-accent text-white font-semibold'
                    : 'text-subtle hover:text-text'
                }`}
                title="View full 18-day observation span"
              >
                🌐 Full (18d)
              </button>
              <button
                onClick={() => setPresetWindow(9.0)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  !isFullView && viewTMin !== null && viewTMax !== null && Math.abs((viewTMax - viewTMin) - 9.0) < 0.5
                    ? 'bg-accent text-white font-semibold'
                    : 'text-subtle hover:text-text'
                }`}
                title="Show 9-day window (3 transits visible for periodicity)"
              >
                👁️ 9d (3 Dips)
              </button>
              <button
                onClick={() => setPresetWindow(3.0)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  !isFullView && viewTMin !== null && viewTMax !== null && Math.abs((viewTMax - viewTMin) - 3.0) < 0.5
                    ? 'bg-accent text-white font-semibold'
                    : 'text-subtle hover:text-text'
                }`}
                title="Zoom into 3-day window (transit dip occupies >5% width)"
              >
                🔍 3d (Zoomed Dip)
              </button>
            </div>

            {(dipMarkers.length > 0 || verticalMarkers.start !== null || horizontalLines.baseline !== null) && (
              <button
                onClick={() => {
                  setDipMarkers([]);
                  setVerticalMarkers({ start: null, end: null });
                  setHorizontalLines({ baseline: null, transitLevel: null });
                }}
                className="px-2 py-0.5 text-xs bg-surface border border-border rounded text-subtle hover:text-text transition-colors"
              >
                Clear markers
              </button>
            )}
            <button
              onClick={resetView}
              className="px-2 py-0.5 text-xs bg-surface border border-border rounded text-subtle hover:text-text transition-colors"
            >
              Reset view
            </button>
          </div>
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width,
          height,
          cursor: mousePos ? getCursor(mousePos.x, mousePos.y) : 'default',
        }}
        className="rounded-lg block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          setMousePos(null);
          setMouseData(null);
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      />

      {/* Readout panel */}
      {!readOnly && (
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 px-1 text-xs font-mono">
          {/* Mouse position */}
          {mouseData && (
            <span className="text-muted">
              Cursor: t={mouseData.t.toFixed(3)}d  f={mouseData.flux.toFixed(5)}
            </span>
          )}

          {/* Dip markers */}
          {dipMarkers.length > 0 && (
            <span className="text-transit-mark">
              Dips: {dipMarkers.map((m) => m.t.toFixed(3) + 'd').join(', ')}
            </span>
          )}

          {/* Vertical markers / period */}
          {(verticalMarkers.start !== null || verticalMarkers.end !== null) && (
            <span className="text-violet-400">
              Bracket: {verticalMarkers.start?.toFixed(3) ?? '—'}
              {' → '}
              {verticalMarkers.end?.toFixed(3) ?? '—'}d
              {computedPeriod !== null && ` (Δ=${computedPeriod.toFixed(3)}d)`}
            </span>
          )}

          {/* Horizontal lines / depth */}
          {(horizontalLines.baseline !== null || horizontalLines.transitLevel !== null) && (
            <span className="text-green-400">
              Baseline: {horizontalLines.baseline?.toFixed(5) ?? '—'}
              {' | Transit: '}
              {horizontalLines.transitLevel?.toFixed(5) ?? '—'}
              {computedDepth !== null && (
                <span className="text-yellow-400">
                  {' '}
                  Depth: {(computedDepth * 100).toFixed(3)}%
                </span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default LightCurveViewer;
