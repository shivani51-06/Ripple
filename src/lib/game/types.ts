import type { ShapeType } from "./shapes";

export interface Pulse {
  id: number;
  shape: ShapeType;
  hue: number;
  isTarget: boolean;
  spawnedAt: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  resolved: boolean;
}

export interface TargetSpec {
  shape: ShapeType;
  hue: number;
}

export interface DifficultyParams {
  spawnIntervalMs: number;
  speedPxPerSec: number;
  similarityBias: number;
  hueJitterMaxDeg: number;
}

export interface SwitchEvent {
  atMs: number;
  respondedAtMs: number | null;
}

export interface RoundTelemetry {
  reactionTimesMs: number[];
  falseTapCount: number;
  missCount: number;
  targetHitCount: number;
  decoyCorrectCount: number;
  switchEvents: SwitchEvent[];
}

export function createEmptyTelemetry(): RoundTelemetry {
  return {
    reactionTimesMs: [],
    falseTapCount: 0,
    missCount: 0,
    targetHitCount: 0,
    decoyCorrectCount: 0,
    switchEvents: [],
  };
}
