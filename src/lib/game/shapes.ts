export type ShapeType =
  | "circle"
  | "hexagon"
  | "pentagon"
  | "diamond"
  | "square"
  | "triangle";

export const SHAPE_TYPES: ShapeType[] = [
  "circle",
  "hexagon",
  "pentagon",
  "diamond",
  "square",
  "triangle",
];

// Rough visual "roundness" used to derive shape-to-shape similarity.
// Two shapes with close roundness look similar at a glance (the property
// the difficulty curve exploits to make decoys harder to reject over time).
const ROUNDNESS: Record<ShapeType, number> = {
  circle: 1.0,
  hexagon: 0.8,
  pentagon: 0.65,
  diamond: 0.4,
  square: 0.3,
  triangle: 0.15,
};

export function shapeSimilarity(a: ShapeType, b: ShapeType): number {
  if (a === b) return 1;
  return 1 - Math.abs(ROUNDNESS[a] - ROUNDNESS[b]);
}

export function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: ShapeType,
  x: number,
  y: number,
  radius: number,
): void {
  ctx.beginPath();
  switch (shape) {
    case "circle":
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      break;
    case "square": {
      const s = radius * 1.6;
      ctx.rect(x - s / 2, y - s / 2, s, s);
      break;
    }
    case "diamond":
      ctx.moveTo(x, y - radius * 1.2);
      ctx.lineTo(x + radius * 1.2, y);
      ctx.lineTo(x, y + radius * 1.2);
      ctx.lineTo(x - radius * 1.2, y);
      ctx.closePath();
      break;
    case "triangle": {
      const h = radius * 1.4;
      ctx.moveTo(x, y - h);
      ctx.lineTo(x + h * 0.95, y + h * 0.7);
      ctx.lineTo(x - h * 0.95, y + h * 0.7);
      ctx.closePath();
      break;
    }
    case "pentagon":
    case "hexagon": {
      const sides = shape === "pentagon" ? 5 : 6;
      const r = radius * 1.15;
      for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
        const px = x + r * Math.cos(angle);
        const py = y + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
  }
}
