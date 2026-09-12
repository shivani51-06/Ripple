import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// Hosted by Google, fetched once and cached by the browser — no server of
// ours is involved, and no camera frames ever leave the device.
const WASM_BASE_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// How long the face must be continuously absent before we call it "away",
// and continuously present again before we call it "back" — debounced both
// directions so a momentary blink or head bob never triggers a pause.
const AWAY_DEBOUNCE_MS = 1200;
const BACK_DEBOUNCE_MS = 300;

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

function getLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = FilesetResolver.forVisionTasks(WASM_BASE_URL).then((fileset) =>
      FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numFaces: 1,
      }),
    );
  }
  return landmarkerPromise;
}

export interface AttentionTracker {
  stop: () => void;
}

/**
 * Starts detecting face presence from `video` and calls `onAwayChange`
 * whenever the debounced away/back state flips. Presence-only (no gaze/yaw
 * estimation) is a deliberate scope choice — simple and robust rather than
 * fine-grained, and "no face in frame" is a solid proxy for "not looking at
 * the screen" for this use case.
 */
export async function startAttentionTracking(
  video: HTMLVideoElement,
  onAwayChange: (isAway: boolean) => void,
): Promise<AttentionTracker> {
  const landmarker = await getLandmarker();

  let rafId = 0;
  let stopped = false;
  let currentlyAway = false;
  let candidateSince: number | null = null;

  function tick() {
    if (stopped) return;
    const now = performance.now();
    const result = landmarker.detectForVideo(video, now);
    const facePresent = result.faceLandmarks.length > 0;
    const wantAway = !facePresent;

    if (wantAway !== currentlyAway) {
      if (candidateSince === null) {
        candidateSince = now;
      } else if (now - candidateSince >= (wantAway ? AWAY_DEBOUNCE_MS : BACK_DEBOUNCE_MS)) {
        currentlyAway = wantAway;
        candidateSince = null;
        onAwayChange(currentlyAway);
      }
    } else {
      candidateSince = null;
    }

    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(rafId);
    },
  };
}
