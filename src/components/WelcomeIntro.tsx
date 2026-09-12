"use client";

import { THEME } from "@/lib/theme";

export function WelcomeIntro({ onContinue }: { onContinue: () => void }) {
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 px-8 text-center"
      style={{ background: `rgba(${THEME.surfaceRgb}, 0.98)` }}
    >
      <h2 className="text-xl font-semibold" style={{ color: THEME.ink }}>
        Welcome to Ripple
      </h2>

      <div className="flex max-w-xs flex-col gap-4 text-left">
        <Feature title="A calm attention game">
          Shapes drift toward the center. Tap only the target shape and let
          everything else pass by.
        </Feature>
        <Feature title="Pauses when you look away">
          Your camera can notice when you look away and pause automatically.
          Fully optional, entirely on your device: nothing is recorded or
          sent anywhere.
        </Feature>
        <Feature title="Track your streak">
          Sign in to keep a daily streak and see your focus score over time.
          Playing without an account works too.
        </Feature>
      </div>

      <button onClick={onContinue} className="btn-primary">
        Get started
      </button>
    </div>
  );
}

function Feature({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold" style={{ color: THEME.ink }}>
        {title}
      </p>
      <p className="text-sm" style={{ color: THEME.inkMuted }}>
        {children}
      </p>
    </div>
  );
}
