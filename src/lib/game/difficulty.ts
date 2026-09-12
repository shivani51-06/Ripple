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
 * The curve shape itself stays fixed (hardcoded, step 2 of the build); what
 * changed in step 5 is where a round starts along it. `startProgress` (0..1)
 * is the ML-predicted personalization — a player who did well last round
 * starts further along the ramp, a struggling player starts earlier. New /
 * first-time players default to 0, which reproduces the original all-players
 * ramp exactly.
 */
export function getDifficulty(elapsedMs: number, startProgress = 0): DifficultyParams {
  const t = startProgress + elapsedMs / ROUND_DURATION_MS;
  return {
    spawnIntervalMs: lerp(1400, 650, t),
    speedPxPerSec: lerp(90, 150, t),
    similarityBias: lerp(0.15, 0.85, t),
    hueJitterMaxDeg: lerp(70, 18, t),
  };
}
