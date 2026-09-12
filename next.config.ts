import type { NextConfig } from "next";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  // Also disabled in production for now, on top of development: the
  // service worker's update lag (a tab can take a reload or two before it
  // notices new code) makes it look like fixes aren't landing during this
  // project's active testing phase. Re-enable once things stabilize, ahead
  // of the final polish/deploy step.
  disable: true,
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
