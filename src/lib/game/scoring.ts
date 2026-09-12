import type { RoundTelemetry } from "./types";

export interface ScoreBreakdown {
  focusScore: number;
  goAccuracy: number;
  inhibitionAccuracy: number;
  meanReactionMs: number | null;
  reactionConsistency: number;
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Focus score derived entirely from behavioral signal captured during the
 * round — no cosmetic counters. This hardcoded formula is the step-2/4
 * placeholder; step 5 replaces it with the trained model's output once
 * there's real session telemetry to train on.
 */
export function computeScore(telemetry: RoundTelemetry): ScoreBreakdown {
  const { reactionTimesMs, falseTapCount, missCount, targetHitCount, decoyCorrectCount } =
    telemetry;

  const totalTargets = targetHitCount + missCount;
  const goAccuracy = totalTargets === 0 ? 1 : targetHitCount / totalTargets;

  const totalDecoys = decoyCorrectCount + falseTapCount;
  const inhibitionAccuracy = totalDecoys === 0 ? 1 : decoyCorrectCount / totalDecoys;

  const meanReactionMs = reactionTimesMs.length ? mean(reactionTimesMs) : null;
  const speedScore =
    meanReactionMs === null ? 0.5 : clamp01(1 - (meanReactionMs - 250) / (1200 - 250));

  const reactionConsistency =
    reactionTimesMs.length < 2 ? 0.5 : clamp01(1 - stddev(reactionTimesMs) / 600);

  const focusScore = Math.round(
    100 *
      (0.35 * goAccuracy +
        0.35 * inhibitionAccuracy +
        0.2 * speedScore +
        0.1 * reactionConsistency),
  );

  return {
    focusScore,
    goAccuracy,
    inhibitionAccuracy,
    meanReactionMs,
    reactionConsistency,
  };
}
