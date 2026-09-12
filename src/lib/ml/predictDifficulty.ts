import "server-only";
import type { SessionFeatures } from "./predictFocusScore";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const difficultyModel = require("./difficultyModel.js");

/**
 * Predicts where the player's *next* round should start on the difficulty
 * ramp (0..1). Server-only and only ever called from /api/session, since it
 * needs the player's persisted startProgress — there's nothing to
 * personalize against for anonymous play, which is fine: those players just
 * keep getting the default cold-start ramp.
 */
export function predictNextStartProgress(
  features: SessionFeatures & { startProgress: number; focusScore: number },
): number {
  const input = difficultyModel.featureOrder.map(
    (key: keyof typeof features) => features[key],
  );
  const raw = difficultyModel.predict(input);
  return Math.max(0, Math.min(1, raw));
}
