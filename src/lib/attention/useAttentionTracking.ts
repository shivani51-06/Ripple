"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AttentionTracker } from "./faceTracker";

export type CameraConsent = "granted" | "declined";

const CONSENT_KEY = "ripple.cameraConsent";

export function getStoredConsent(): CameraConsent | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(CONSENT_KEY);
  return stored === "granted" || stored === "declined" ? stored : null;
}

function storeConsent(consent: CameraConsent) {
  localStorage.setItem(CONSENT_KEY, consent);
}

interface UseAttentionTrackingResult {
  enabled: boolean;
  isAway: boolean;
  error: string | null;
  enable: () => Promise<void>;
  disable: () => void;
}

/**
 * Owns the camera stream + MediaPipe tracker lifecycle. Never starts on its
 * own — `enable()` must be called from an explicit user action, and only
 * after the consent screen has been shown (see AttentionConsent.tsx).
 */
export function useAttentionTracking(
  onAwayChange: (isAway: boolean) => void,
): UseAttentionTrackingResult {
  const [enabled, setEnabled] = useState(false);
  const [isAway, setIsAway] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackerRef = useRef<AttentionTracker | null>(null);
  const onAwayChangeRef = useRef(onAwayChange);
  useEffect(() => {
    onAwayChangeRef.current = onAwayChange;
  }, [onAwayChange]);

  const disable = useCallback(() => {
    trackerRef.current?.stop();
    trackerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setEnabled(false);
    setIsAway(false);
  }, []);

  const enable = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;

      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      videoRef.current = video;

      // Dynamically imported so @mediapipe/tasks-vision (a sizeable
      // library) is only ever downloaded once a player opts in, not as
      // part of the game's normal load.
      const { startAttentionTracking } = await import("./faceTracker");
      trackerRef.current = await startAttentionTracking(video, (away) => {
        setIsAway(away);
        onAwayChangeRef.current(away);
      });

      storeConsent("granted");
      setEnabled(true);
    } catch {
      setError("Couldn't access the camera — you can still play normally without it.");
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => disable, [disable]);

  return { enabled, isAway, error, enable, disable };
}

export { storeConsent as storeCameraConsent };
