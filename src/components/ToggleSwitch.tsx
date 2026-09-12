"use client";

import { THEME } from "@/lib/theme";

export function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      style={{
        width: 40,
        height: 22,
        borderRadius: 999,
        background: checked ? THEME.accent : THEME.inkFaint,
        position: "relative",
        transition: "background-color 0.2s ease",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: THEME.surface,
          transition: "left 0.2s ease",
        }}
      />
    </button>
  );
}
