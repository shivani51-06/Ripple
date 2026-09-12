import { drawShape } from "./shapes";
import { CENTER, ARENA_RADIUS, CORE_RADIUS, LOGICAL_SIZE, hueToColor } from "./engine";
import { ROUND_DURATION_MS } from "./difficulty";
import type { Pulse, TargetSpec } from "./types";
import { THEME } from "@/lib/theme";

export interface TapEffect {
  x: number;
  y: number;
  color: string;
  startedAt: number;
  correct: boolean;
}

export interface RenderState {
  now: number;
  elapsedMs: number;
  pulses: Pulse[];
  target: TargetSpec;
  bannerUntil: number;
  bannerTarget: TargetSpec | null;
  effects: TapEffect[];
  paused: boolean;
}

const BG = THEME.surface;
const INK = THEME.ink;
const MUTED_INK = THEME.inkMuted;

export function renderFrame(ctx: CanvasRenderingContext2D, s: RenderState) {
  ctx.clearRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);

  // Ambient breathing rings, purely decorative.
  ctx.save();
  ctx.strokeStyle = `rgba(${THEME.inkRgb}, 0.07)`;
  ctx.lineWidth = 1.5;
  for (let i = 1; i <= 3; i++) {
    const wobble = Math.sin(s.now / 2200 + i) * 6;
    ctx.beginPath();
    ctx.arc(CENTER.x, CENTER.y, ARENA_RADIUS * (i / 3.4) + wobble, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // Core / target zone.
  ctx.beginPath();
  ctx.strokeStyle = `rgba(${THEME.inkRgb}, 0.2)`;
  ctx.lineWidth = 2;
  ctx.arc(CENTER.x, CENTER.y, CORE_RADIUS, 0, Math.PI * 2);
  ctx.stroke();

  // Pulses.
  for (const p of s.pulses) {
    ctx.save();
    ctx.fillStyle = hueToColor(p.hue);
    ctx.shadowColor = hueToColor(p.hue);
    ctx.shadowBlur = 10;
    drawShape(ctx, p.shape, p.x, p.y, p.radius);
    ctx.fill();
    ctx.restore();
  }

  // Tap feedback ripples, fading out.
  const EFFECT_LIFE_MS = 450;
  for (const e of s.effects) {
    const age = s.now - e.startedAt;
    if (age > EFFECT_LIFE_MS) continue;
    const t = age / EFFECT_LIFE_MS;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = e.correct ? e.color : `${THEME.danger}88`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 10 + t * 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // HUD: time bar.
  const progress = Math.min(1, s.elapsedMs / ROUND_DURATION_MS);
  ctx.fillStyle = `rgba(${THEME.inkRgb}, 0.1)`;
  ctx.fillRect(24, 20, LOGICAL_SIZE - 48, 5);
  ctx.fillStyle = `rgba(${THEME.accentRgb}, 0.75)`;
  ctx.fillRect(24, 20, (LOGICAL_SIZE - 48) * (1 - progress), 5);

  const secondsLeft = Math.max(0, Math.ceil((ROUND_DURATION_MS - s.elapsedMs) / 1000));
  ctx.fillStyle = MUTED_INK;
  ctx.font = "13px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`${secondsLeft}s`, LOGICAL_SIZE - 24, 46);

  // HUD: target reminder.
  ctx.save();
  ctx.fillStyle = hueToColor(s.target.hue);
  drawShape(ctx, s.target.shape, 44, 44, 12);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = MUTED_INK;
  ctx.textAlign = "left";
  ctx.fillText("tap only this", 64, 48);

  // Target-switch banner.
  if (s.now < s.bannerUntil && s.bannerTarget) {
    const alpha = Math.min(1, (s.bannerUntil - s.now) / 1600);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgba(${THEME.inkRgb}, 0.9)`;
    ctx.textAlign = "center";
    ctx.font = "600 18px system-ui, sans-serif";
    ctx.fillText("New target", CENTER.x, CENTER.y - 70);
    ctx.fillStyle = hueToColor(s.bannerTarget.hue);
    drawShape(ctx, s.bannerTarget.shape, CENTER.x, CENTER.y - 40, 14);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = INK;

  // Attention-tracking pause — drawn last, over everything else.
  if (s.paused) {
    ctx.save();
    ctx.fillStyle = `rgba(${THEME.surfaceRgb}, 0.9)`;
    ctx.fillRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
    ctx.fillStyle = `rgba(${THEME.inkRgb}, 0.9)`;
    ctx.textAlign = "center";
    ctx.font = "600 20px system-ui, sans-serif";
    ctx.fillText("Paused", CENTER.x, CENTER.y - 12);
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillStyle = MUTED_INK;
    ctx.fillText("Look back at the screen to continue", CENTER.x, CENTER.y + 14);
    ctx.restore();
  }
}
