// Shared color palette. A warm, cozy (cabin-at-dusk) feel rather than a
// clinical pale one, kept muted so it still reads as calm, not busy. Mirror
// any change here into globals.css and public/manifest.json.
export const THEME = {
  pageBgTop: "#f7ecd6",
  pageBgBottom: "#e9d3a8",
  surface: "#faf3e2",
  surfaceRgb: "250, 243, 226",
  ink: "#4a3728",
  inkRgb: "74, 55, 40",
  inkMuted: "#8c7561",
  inkMutedRgb: "140, 117, 97",
  inkFaint: "#b3a08a",
  accent: "#b6693f",
  accentRgb: "182, 105, 63",
  btnBg: "#4a3323",
  btnBgHover: "#3a271b",
  btnText: "#f7ecd9",
  danger: "#a24a3f",
} as const;

// Pulse shape colors: dusty rose, dusty blue, sage, mustard — distinct
// enough from each other and from the warm background for the Go/No-Go
// task to stay readable, while keeping the cozy palette.
export const PULSE_HUES = [350, 205, 100, 40];
export const PULSE_SATURATION = 48;
export const PULSE_LIGHTNESS = 58;
