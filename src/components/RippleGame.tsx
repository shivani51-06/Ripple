"use client";

import { useEffect, useRef, useState } from "react";
import {
  LOGICAL_SIZE,
  findTappedPulse,
  hasReachedCore,
  hueToColor,
  pickRandomTarget,
  spawnPulse,
  stepPulse,
} from "@/lib/game/engine";
import { ROUND_DURATION_MS, TARGET_SWITCH_TIMES_MS, getDifficulty } from "@/lib/game/difficulty";
import { renderFrame, type TapEffect } from "@/lib/game/render";
import { computeScore, type ScoreBreakdown } from "@/lib/game/scoring";
import {
  createEmptyTelemetry,
  type Pulse,
  type RoundTelemetry,
  type SwitchEvent,
  type TargetSpec,
} from "@/lib/game/types";
import { RippleAudio } from "@/lib/game/audio";
import { ShapePreview } from "./ShapePreview";
import { useAuth } from "@/lib/auth/AuthContext";
import { predictFocusScore } from "@/lib/ml/predictFocusScore";
import Link from "next/link";

function switchAccuracy(switchEvents: SwitchEvent[]): number {
  if (switchEvents.length === 0) return 1;
  return switchEvents.filter((e) => e.respondedAtMs !== null).length / switchEvents.length;
}

type Phase = "ready" | "playing" | "summary";

interface StreakInfo {
  currentStreak: number;
  countedTowardStreak: boolean;
}

export function RippleGame() {
  const { idToken } = useAuth();
  const [phase, setPhase] = useState<Phase>("ready");
  const [target, setTarget] = useState<TargetSpec>(() => pickRandomTarget());
  const [scoreResult, setScoreResult] = useState<ScoreBreakdown | null>(null);
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
  const [muted, setMuted] = useState(false);
  const idTokenRef = useRef(idToken);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pulsesRef = useRef<Pulse[]>([]);
  const telemetryRef = useRef<RoundTelemetry>(createEmptyTelemetry());
  const targetRef = useRef<TargetSpec>(target);
  const roundStartRef = useRef(0);
  const nextSpawnAtRef = useRef(0);
  const switchIndexRef = useRef(0);
  const bannerUntilRef = useRef(0);
  const bannerTargetRef = useRef<TargetSpec | null>(null);
  const effectsRef = useRef<TapEffect[]>([]);
  const audioRef = useRef<RippleAudio | null>(null);
  const mutedRef = useRef(muted);
  // ML-personalized ramp start for the *next* round (0..1). Stays 0 — the
  // original fixed-curve default — until a signed-in player's first
  // /api/session response comes back with a recommendation.
  const startProgressRef = useRef(0);

  useEffect(() => {
    mutedRef.current = muted;
    audioRef.current?.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    idTokenRef.current = idToken;
  }, [idToken]);

  async function reportSession(score: ScoreBreakdown) {
    const token = idTokenRef.current;
    if (!token) return;
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          focusScore: score.focusScore,
          goAccuracy: score.goAccuracy,
          inhibitionAccuracy: score.inhibitionAccuracy,
          meanReactionMs: score.meanReactionMs,
          reactionConsistency: score.reactionConsistency,
          targetSwitchAccuracy: switchAccuracy(telemetryRef.current.switchEvents),
          startProgress: startProgressRef.current,
          targetHitCount: telemetryRef.current.targetHitCount,
          missCount: telemetryRef.current.missCount,
          falseTapCount: telemetryRef.current.falseTapCount,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setStreakInfo({ currentStreak: data.currentStreak, countedTowardStreak: data.countedTowardStreak });
      if (typeof data.nextStartProgress === "number") {
        startProgressRef.current = data.nextStartProgress;
      }
    } catch {
      // Streak tracking is a bonus, not a gameplay requirement — fail quietly.
    }
  }

  async function reportTelemetry(score: ScoreBreakdown) {
    // Unlike reportSession, this runs whether or not the player is signed
    // in — raw telemetry for model retraining is useful from anonymous
    // play too, and the game must work fully without an account.
    const token = idTokenRef.current;
    try {
      await fetch("/api/telemetry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...telemetryRef.current,
          roundDurationMs: ROUND_DURATION_MS,
          focusScore: score.focusScore,
        }),
      });
    } catch {
      // Best-effort upload — never blocks or interrupts the round summary.
    }
  }

  function startRound() {
    // Reuses whatever target is already shown on the ready screen — it must
    // never change between "here's your target" and the round actually
    // starting, or the shown preview lies to the player.
    targetRef.current = target;
    pulsesRef.current = [];
    telemetryRef.current = createEmptyTelemetry();
    setStreakInfo(null);
    switchIndexRef.current = 0;
    bannerUntilRef.current = 0;
    bannerTargetRef.current = null;
    effectsRef.current = [];
    roundStartRef.current = performance.now();
    nextSpawnAtRef.current = performance.now() + 400;

    if (!audioRef.current) audioRef.current = new RippleAudio();
    audioRef.current.setMuted(mutedRef.current);
    audioRef.current.startAmbience();

    setPhase("playing");
  }

  function prepareNextRound() {
    setTarget(pickRandomTarget());
    setPhase("ready");
  }

  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    const maybeCtx = canvas?.getContext("2d");
    if (!canvas || !maybeCtx) return;
    const ctx: CanvasRenderingContext2D = maybeCtx;

    let rafId = 0;

    function finishRound() {
      audioRef.current?.stopAmbience();
      const honest = computeScore(telemetryRef.current);
      // The headline number comes from the learned model (step 5); the
      // breakdown lines stay the transparent formula-derived values so the
      // score is never a black box to the player.
      const mlFocusScore = predictFocusScore({
        reactionTimeMeanMs: honest.meanReactionMs ?? 700,
        reactionTimeStdMs: (1 - honest.reactionConsistency) * 600,
        falseTapRate: 1 - honest.inhibitionAccuracy,
        missRate: 1 - honest.goAccuracy,
        targetSwitchAccuracy: switchAccuracy(telemetryRef.current.switchEvents),
      });
      const result: ScoreBreakdown = { ...honest, focusScore: mlFocusScore };
      setScoreResult(result);
      setPhase("summary");
      reportSession(result);
      reportTelemetry(result);
    }

    function frame(now: number) {
      const elapsed = now - roundStartRef.current;

      if (elapsed >= ROUND_DURATION_MS) {
        finishRound();
        return;
      }

      const difficulty = getDifficulty(elapsed, startProgressRef.current);

      while (
        switchIndexRef.current < TARGET_SWITCH_TIMES_MS.length &&
        elapsed >= TARGET_SWITCH_TIMES_MS[switchIndexRef.current]
      ) {
        const newTarget = pickRandomTarget(targetRef.current.shape);
        targetRef.current = newTarget;
        setTarget(newTarget);
        telemetryRef.current.switchEvents.push({ atMs: elapsed, respondedAtMs: null });
        bannerUntilRef.current = now + 1600;
        bannerTargetRef.current = newTarget;
        switchIndexRef.current++;
      }

      if (now >= nextSpawnAtRef.current) {
        pulsesRef.current.push(spawnPulse(targetRef.current, difficulty, now));
        nextSpawnAtRef.current = now + difficulty.spawnIntervalMs * (0.85 + Math.random() * 0.3);
      }

      const dtSec = 1 / 60;
      const stillActive: Pulse[] = [];
      for (const raw of pulsesRef.current) {
        if (raw.resolved) continue;
        const p = stepPulse(raw, dtSec);
        if (hasReachedCore(p)) {
          if (p.isTarget) {
            telemetryRef.current.missCount++;
            audioRef.current?.miss();
          } else {
            telemetryRef.current.decoyCorrectCount++;
          }
          continue;
        }
        stillActive.push(p);
      }
      pulsesRef.current = stillActive;

      effectsRef.current = effectsRef.current.filter((e) => now - e.startedAt < 450);

      renderFrame(ctx, {
        now,
        elapsedMs: elapsed,
        pulses: pulsesRef.current,
        target: targetRef.current,
        bannerUntil: bannerUntilRef.current,
        bannerTarget: bannerTargetRef.current,
        effects: effectsRef.current,
      });

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [phase]);

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * LOGICAL_SIZE;
    const y = ((e.clientY - rect.top) / rect.height) * LOGICAL_SIZE;

    const tapped = findTappedPulse(pulsesRef.current, x, y);
    if (!tapped) return;

    tapped.resolved = true;
    pulsesRef.current = pulsesRef.current.filter((p) => p.id !== tapped.id);

    const now = performance.now();
    effectsRef.current.push({
      x: tapped.x,
      y: tapped.y,
      color: hueToColor(tapped.hue),
      startedAt: now,
      correct: tapped.isTarget,
    });

    if (tapped.isTarget) {
      telemetryRef.current.reactionTimesMs.push(now - tapped.spawnedAt);
      telemetryRef.current.targetHitCount++;
      const pendingSwitch = telemetryRef.current.switchEvents.find(
        (se) => se.respondedAtMs === null,
      );
      if (pendingSwitch) {
        pendingSwitch.respondedAtMs = now - roundStartRef.current - pendingSwitch.atMs;
      }
      audioRef.current?.correctHit();
    } else {
      telemetryRef.current.falseTapCount++;
      audioRef.current?.falseTap();
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative overflow-hidden rounded-2xl shadow-sm"
        style={{ width: "min(90vw, 560px)", height: "min(90vw, 560px)" }}
      >
        <canvas
          ref={canvasRef}
          width={LOGICAL_SIZE}
          height={LOGICAL_SIZE}
          onPointerDown={handlePointerDown}
          style={{ width: "100%", height: "100%", touchAction: "none" }}
        />

        {phase === "ready" && (
          <Overlay>
            <p className="text-sm" style={{ color: "#8a9399" }}>
              Tap only the shape below. Let everything else drift past.
            </p>
            <ShapePreview shape={target.shape} hue={target.hue} size={72} />
            <button onClick={startRound} className="btn-primary">
              Start round
            </button>
          </Overlay>
        )}

        {phase === "summary" && scoreResult && (
          <Overlay>
            <p className="text-sm uppercase tracking-wide" style={{ color: "#8a9399" }}>
              Focus score
            </p>
            <p className="text-5xl font-semibold" style={{ color: "#2f3e46" }}>
              {scoreResult.focusScore}
            </p>
            <div className="text-sm" style={{ color: "#52616b" }}>
              <p>Accuracy on target: {Math.round(scoreResult.goAccuracy * 100)}%</p>
              <p>Correctly ignored decoys: {Math.round(scoreResult.inhibitionAccuracy * 100)}%</p>
              {scoreResult.meanReactionMs !== null && (
                <p>Avg reaction: {Math.round(scoreResult.meanReactionMs)}ms</p>
              )}
            </div>

            {idToken ? (
              streakInfo && (
                <p className="text-sm" style={{ color: "#4a6a7a" }}>
                  {streakInfo.countedTowardStreak
                    ? `Streak: ${streakInfo.currentStreak} day${streakInfo.currentStreak === 1 ? "" : "s"}`
                    : "Streak already counted for today"}
                </p>
              )
            ) : (
              <Link href="/account" className="text-sm underline" style={{ color: "#8a9399" }}>
                Sign in to save your streak
              </Link>
            )}

            <button onClick={prepareNextRound} className="btn-primary">
              Play again
            </button>
          </Overlay>
        )}
      </div>

      <button
        onClick={() => setMuted((m) => !m)}
        className="text-xs"
        style={{ color: "#9aa5ab" }}
      >
        {muted ? "Sound off" : "Sound on"}
      </button>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center"
      style={{ background: "rgba(244, 241, 236, 0.92)" }}
    >
      {children}
    </div>
  );
}
