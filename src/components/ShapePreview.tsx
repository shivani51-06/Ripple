"use client";

import { useEffect, useRef } from "react";
import { drawShape, type ShapeType } from "@/lib/game/shapes";
import { hueToColor } from "@/lib/game/engine";

export function ShapePreview({
  shape,
  hue,
  size = 56,
}: {
  shape: ShapeType;
  hue: number;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = hueToColor(hue);
    drawShape(ctx, shape, size / 2, size / 2, size * 0.3);
    ctx.fill();
  }, [shape, hue, size]);

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size }}
      aria-label={`Target shape: ${shape}`}
    />
  );
}
