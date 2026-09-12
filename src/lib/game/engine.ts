import { SHAPE_TYPES, shapeSimilarity, type ShapeType } from "./shapes";
import type { DifficultyParams, Pulse, TargetSpec } from "./types";
import { PULSE_HUES, PULSE_SATURATION, PULSE_LIGHTNESS } from "@/lib/theme";

export const LOGICAL_SIZE = 640;
export const CENTER = { x: LOGICAL_SIZE / 2, y: LOGICAL_SIZE / 2 };
export const ARENA_RADIUS = 290;
export const CORE_RADIUS = 28;
export const PULSE_RADIUS = 20;

// Kept desaturated enough that the game reads as calm, not alarming, even
// when difficulty (and pulse density) is high.
export const PALETTE_HUES = PULSE_HUES;

export function hueToColor(hue: number): string {
  const h = ((hue % 360) + 360) % 360;
  return `hsl(${h}, ${PULSE_SATURATION}%, ${PULSE_LIGHTNESS}%)`;
}

export function pickRandomTarget(excludeShape?: ShapeType): TargetSpec {
  const pool = excludeShape
    ? SHAPE_TYPES.filter((s) => s !== excludeShape)
    : SHAPE_TYPES;
  const shape = pool[Math.floor(Math.random() * pool.length)];
  const hue = PALETTE_HUES[Math.floor(Math.random() * PALETTE_HUES.length)];
  return { shape, hue };
}

function pickDecoyShape(targetShape: ShapeType, similarityBias: number): ShapeType {
  const weights = SHAPE_TYPES.map((s) =>
    Math.pow(0.15 + shapeSimilarity(targetShape, s), 1 + similarityBias * 3),
  );
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SHAPE_TYPES.length; i++) {
    r -= weights[i];
    if (r <= 0) return SHAPE_TYPES[i];
  }
  return SHAPE_TYPES[SHAPE_TYPES.length - 1];
}

const MIN_HUE_JITTER_DEG = 8;

function pickHueJitter(maxDeg: number): number {
  const magnitude = MIN_HUE_JITTER_DEG + Math.random() * Math.max(0, maxDeg - MIN_HUE_JITTER_DEG);
  return Math.random() < 0.5 ? -magnitude : magnitude;
}

let idCounter = 0;

// Target pulses spawn less often than decoys so correctly withholding a tap
// (the "no-go" half of the task) is the more common decision, not a rarity.
const TARGET_SPAWN_PROBABILITY = 0.32;

export function spawnPulse(
  target: TargetSpec,
  difficulty: DifficultyParams,
  now: number,
): Pulse {
  const angle = Math.random() * Math.PI * 2;
  const spawnX = CENTER.x + ARENA_RADIUS * Math.cos(angle);
  const spawnY = CENTER.y + ARENA_RADIUS * Math.sin(angle);
  const dx = CENTER.x - spawnX;
  const dy = CENTER.y - spawnY;
  const dist = Math.hypot(dx, dy);
  const speed = difficulty.speedPxPerSec;
  const vx = (dx / dist) * speed;
  const vy = (dy / dist) * speed;

  const isTarget = Math.random() < TARGET_SPAWN_PROBABILITY;
  const shape = isTarget
    ? target.shape
    : pickDecoyShape(target.shape, difficulty.similarityBias);
  const hue = isTarget ? target.hue : target.hue + pickHueJitter(difficulty.hueJitterMaxDeg);

  return {
    id: idCounter++,
    shape,
    hue,
    isTarget,
    spawnedAt: now,
    x: spawnX,
    y: spawnY,
    vx,
    vy,
    radius: PULSE_RADIUS,
    resolved: false,
  };
}

export function stepPulse(pulse: Pulse, dtSec: number): Pulse {
  return { ...pulse, x: pulse.x + pulse.vx * dtSec, y: pulse.y + pulse.vy * dtSec };
}

export function distanceToCenter(pulse: Pulse): number {
  return Math.hypot(pulse.x - CENTER.x, pulse.y - CENTER.y);
}

export function hasReachedCore(pulse: Pulse): boolean {
  return distanceToCenter(pulse) <= CORE_RADIUS;
}

const TAP_TOLERANCE_PX = 16;

/** Nearest unresolved pulse within tap tolerance of the click point, if any. */
export function findTappedPulse(pulses: Pulse[], x: number, y: number): Pulse | null {
  let best: Pulse | null = null;
  let bestDist = Infinity;
  for (const p of pulses) {
    if (p.resolved) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d <= p.radius + TAP_TOLERANCE_PX && d < bestDist) {
      best = p;
      bestDist = d;
    }
  }
  return best;
}
