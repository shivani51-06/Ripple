"use client";

import { storeCameraConsent } from "@/lib/attention/useAttentionTracking";
import { THEME } from "@/lib/theme";

export function AttentionConsent({
  onAllow,
  onDecline,
}: {
  onAllow: () => void;
  onDecline: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 overflow-y-auto px-8 py-8 text-center"
      style={{ background: `rgba(${THEME.surfaceRgb}, 0.97)` }}
    >
      <h2 className="text-lg font-semibold" style={{ color: THEME.ink }}>
        Pause when you look away?
      </h2>
      <p className="max-w-xs text-sm" style={{ color: THEME.inkMuted }}>
        Ripple can use your camera to notice when you look away and pause the
        round until you&apos;re back. Everything happens on your device, and
        nothing is recorded, saved, or sent anywhere.
      </p>
      <p className="max-w-xs text-sm" style={{ color: THEME.inkFaint }}>
        This is entirely optional. Ripple works fully without it.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => {
            storeCameraConsent("declined");
            onDecline();
          }}
          className="text-sm underline"
          style={{ color: THEME.inkFaint }}
        >
          Not now
        </button>
        <button onClick={onAllow} className="btn-primary">
          Enable camera
        </button>
      </div>
    </div>
  );
}
