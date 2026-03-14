/**
 * MoodForge GEMS 9 Spider-Web Radar — React/Canvas port.
 * Drag dots along 9 spokes to set desired emotional levels.
 */
import { useRef, useEffect, useCallback, useState } from "react";
import {
  GEMS_KEYS, GEMS_LABELS, GEMS_COLORS,
  type GemsKey,
} from "@/lib/gems-data";

interface MoodRadarProps {
  values: Record<GemsKey, number>;
  onChange: (key: GemsKey, value: number) => void;
  onDragEnd?: () => void;
  size?: number;
}

const PAD = 56;
const N = GEMS_KEYS.length;

function getAngles() {
  return GEMS_KEYS.map((_, i) => (i / N) * Math.PI * 2 - Math.PI / 2);
}

export default function MoodRadar({ values, onChange, onDragEnd, size }: MoodRadarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<number>(-1);
  const [dragging, setDragging] = useState(-1);

  const getLogical = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return { w: 400, h: 400 };
    return { w: el.offsetWidth, h: el.offsetHeight };
  }, []);

  const radarRadius = useCallback(() => {
    const { w, h } = getLogical();
    return Math.min(w - PAD * 2, h - PAD * 2) * 0.46;
  }, [getLogical]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const { w: W, h: H } = getLogical();
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    // Background
    const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
    grad.addColorStop(0, "hsl(234, 20%, 9%)");
    grad.addColorStop(1, "hsl(234, 25%, 5%)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;
    const maxR = radarRadius();
    const angles = getAngles();

    // Grid rings
    for (let r = 1; r <= 5; r++) {
      const radius = maxR * r / 5;
      ctx.beginPath();
      angles.forEach((a, i) => {
        const x = cx + Math.cos(a) * radius;
        const y = cy + Math.sin(a) * radius;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.strokeStyle = `rgba(108,99,255,${0.04 + r * 0.015})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.stroke();
    }

    // Spokes
    angles.forEach(a => {
      ctx.strokeStyle = "rgba(108,99,255,0.09)";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
      ctx.stroke();
    });

    // Labels
    const labelR = maxR + 18;
    ctx.font = "500 10px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
    ctx.fillStyle = "rgba(108,99,255,0.45)";
    angles.forEach((a, i) => {
      const lx = cx + Math.cos(a) * labelR;
      const ly = cy + Math.sin(a) * labelR;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      ctx.textAlign = Math.abs(cosA) < 0.2 ? "center" : cosA > 0 ? "left" : "right";
      ctx.textBaseline = Math.abs(sinA) < 0.2 ? "middle" : sinA > 0 ? "top" : "bottom";
      ctx.fillText(GEMS_LABELS[GEMS_KEYS[i]], lx, ly);
    });

    // Filled polygon
    ctx.beginPath();
    angles.forEach((a, i) => {
      const val = values[GEMS_KEYS[i]] || 0;
      const r2 = val * maxR;
      const x = cx + Math.cos(a) * r2;
      const y = cy + Math.sin(a) * r2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    const polyGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
    polyGrad.addColorStop(0, "rgba(108,99,255,0.30)");
    polyGrad.addColorStop(1, "rgba(108,99,255,0.06)");
    ctx.fillStyle = polyGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(108,99,255,0.55)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Spoke dots
    GEMS_KEYS.forEach((key, i) => {
      const a = angles[i];
      const val = values[key] || 0;
      const r2 = val * maxR;
      const x = cx + Math.cos(a) * r2;
      const y = cy + Math.sin(a) * r2;
      const color = GEMS_COLORS[key];
      const active = draggingRef.current === i;

      if (active) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 28;
      }

      // Outer glow ring
      ctx.beginPath();
      ctx.arc(x, y, active ? 12 : 9, 0, Math.PI * 2);
      ctx.fillStyle = color + (active ? "40" : "20");
      ctx.fill();

      // Main dot
      ctx.beginPath();
      ctx.arc(x, y, active ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Inner highlight
      ctx.beginPath();
      ctx.arc(x - 1.5, y - 1.5, active ? 3 : 2.2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fill();

      ctx.shadowBlur = 0;
    });

    // Title
    ctx.font = "bold 9px -apple-system, BlinkMacSystemFont, system-ui";
    ctx.fillStyle = "rgba(108,99,255,0.22)";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("GEMS 9 DIMENSIONS", PAD + 2, PAD + 2);
  }, [values, getLogical, radarRadius]);

  // Pointer helpers
  const getPointerPos = useCallback((e: React.PointerEvent): [number, number] => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }, []);

  const getSpokeForXY = useCallback((mx: number, my: number): number => {
    const { w, h } = getLogical();
    const cx = w / 2, cy = h / 2;
    const maxR = radarRadius();
    const angles = getAngles();

    // Check proximity to dot positions first
    for (let i = 0; i < N; i++) {
      const a = angles[i];
      const val = values[GEMS_KEYS[i]] || 0;
      const r = val * maxR;
      const dx = cx + Math.cos(a) * r - mx;
      const dy = cy + Math.sin(a) * r - my;
      if (Math.hypot(dx, dy) < 20) return i;
    }

    // Nearest spoke by angle
    const mouseAngle = Math.atan2(my - cy, mx - cx);
    let best = 0, bestDiff = Infinity;
    angles.forEach((a, i) => {
      let diff = Math.abs(mouseAngle - a);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < bestDiff) { bestDiff = diff; best = i; }
    });
    return best;
  }, [getLogical, radarRadius, values]);

  const getValueForXY = useCallback((spokeIdx: number, mx: number, my: number): number => {
    const { w, h } = getLogical();
    const cx = w / 2, cy = h / 2;
    const maxR = radarRadius();
    const a = getAngles()[spokeIdx];
    const proj = (mx - cx) * Math.cos(a) + (my - cy) * Math.sin(a);
    return Math.max(0, Math.min(1, proj / maxR));
  }, [getLogical, radarRadius]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const [mx, my] = getPointerPos(e);
    const { w, h } = getLogical();
    if (Math.hypot(mx - w / 2, my - h / 2) > radarRadius() + 24) return;
    const spoke = getSpokeForXY(mx, my);
    draggingRef.current = spoke;
    setDragging(spoke);
    canvasRef.current?.setPointerCapture(e.pointerId);
    onChange(GEMS_KEYS[spoke], getValueForXY(spoke, mx, my));
  }, [getPointerPos, getLogical, radarRadius, getSpokeForXY, getValueForXY, onChange]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (draggingRef.current < 0) return;
    const [mx, my] = getPointerPos(e);
    onChange(GEMS_KEYS[draggingRef.current], getValueForXY(draggingRef.current, mx, my));
  }, [getPointerPos, getValueForXY, onChange]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (draggingRef.current < 0) return;
    const [mx, my] = getPointerPos(e);
    onChange(GEMS_KEYS[draggingRef.current], getValueForXY(draggingRef.current, mx, my));
    draggingRef.current = -1;
    setDragging(-1);
    onDragEnd?.();
  }, [getPointerPos, getValueForXY, onChange, onDragEnd]);

  // Render on value changes
  useEffect(() => { render(); }, [render, dragging]);
  useEffect(() => {
    const handleResize = () => render();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [render]);

  return (
    <div ref={containerRef} className="w-full aspect-square relative" style={size ? { width: size, height: size } : {}}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none"
        style={{ cursor: dragging >= 0 ? "grabbing" : "grab" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { draggingRef.current = -1; setDragging(-1); }}
      />
    </div>
  );
}
