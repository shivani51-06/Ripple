"use client";

import dynamic from "next/dynamic";

// The game relies on Math.random() at initial render (target shape/color)
// and on Canvas, so it must never be server-rendered — SSR would produce a
// different random target than the client and fail hydration.
const RippleGame = dynamic(() => import("./RippleGame").then((mod) => mod.RippleGame), {
  ssr: false,
});

export function RippleGameLoader() {
  return <RippleGame />;
}
