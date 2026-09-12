"use client";

import { THEME } from "@/lib/theme";
import { ToggleSwitch } from "./ToggleSwitch";

export function WelcomeIntro({
  onContinue,
  onSignIn,
  soundOn,
  onToggleSound,
}: {
  onContinue: () => void;
  onSignIn: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center gap-5 overflow-y-auto px-8 py-8 text-center"
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

      <div
        className="flex w-full max-w-xs items-center justify-between gap-3 rounded-xl px-4 py-3 text-left"
        style={{ background: `rgba(${THEME.inkRgb}, 0.06)` }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: THEME.ink }}>
            Calming background sound
          </p>
          <p className="text-xs" style={{ color: THEME.inkMuted }}>
            A soft ambient tone plays while you play, meant to help you settle
            in rather than stimulate you. Your choice, anytime.
          </p>
        </div>
        <ToggleSwitch checked={soundOn} onChange={onToggleSound} />
      </div>

      <div className="flex flex-col items-center gap-2 pb-2">
        <button onClick={onSignIn} className="btn-primary">
          Sign in or create account
        </button>
        <button
          onClick={onContinue}
          className="text-sm underline"
          style={{ color: THEME.inkMuted }}
        >
          Skip for now, just play
        </button>
      </div>
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
