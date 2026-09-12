import type { DifficultyParams } from "./types";

export const ROUND_DURATION_MS = 75_000;

// Two mid-round target switches add working-memory load without making the
// round feel chaotic. Kept away from the very start/end so players always
// get a clean stretch to warm up and to finish on.
export const TARGET_SWITCH_TIMES_MS = [25_000, 50_000];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/**
 * Hardcoded difficulty curve (step 2 of the build: hardcode this, replace
 * with the trained model's output once telemetry exists to train on).
 */
export function getDifficulty(elapsedMs: number): DifficultyParams {
  const t = elapsedMs / ROUND_DURATION_MS;
  return {
    spawnIntervalMs: lerp(1400, 650, t),
    speedPxPerSec: lerp(90, 150, t),
    similarityBias: lerp(0.15, 0.85, t),
    hueJitterMaxDeg: lerp(70, 18, t),
  };
}
