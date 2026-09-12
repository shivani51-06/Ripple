// Client-safe: the game must show a focus score even for signed-out
// players, so this can't be server-only like the difficulty model is.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const focusScoreModel = require("./focusScoreModel.js");

export interface SessionFeatures {
  reactionTimeMeanMs: number;
  reactionTimeStdMs: number;
  falseTapRate: number;
  missRate: number;
  targetSwitchAccuracy: number;
}

/** Learned approximation of the honest scoring formula — see ml/train.py. */
export function predictFocusScore(features: SessionFeatures): number {
  const input = focusScoreModel.featureOrder.map(
    (key: keyof SessionFeatures) => features[key],
  );
  const raw = focusScoreModel.predict(input);
  return Math.max(0, Math.min(100, Math.round(raw)));
}
