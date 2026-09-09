import type { NextConfig } from "next";

/**
 * Sent on every response.
 *
 * Vercel already terminates TLS and sends HSTS; these are the ones a static
 * site still has to ask for. Deliberately not a Content-Security-Policy: the
 * JSON-LD is an inline script, so a useful CSP would need per-request nonces,
 * and generating those forces every page out of static rendering. That is a
 * poor trade for a site with no forms, no auth and no user input.
 */
const SECURITY_HEADERS = [
  // Honour the declared Content-Type instead of guessing from the bytes. Stops
  // a file that is served as text or an image being run as script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Nobody needs to frame this, and saying so is what prevents clickjacking.
  { key: "X-Frame-Options", value: "DENY" },
  // Send the full path to ourselves, only the bare origin to anyone else, and
  // nothing at all when leaving HTTPS. The Projects page links out a lot, and
  // those hosts have no business knowing which page someone came from.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Hand back the hardware this site has no use for, so nothing injected here
  // could ever ask for it. Note what is NOT dropped: the hero reads
  // deviceorientation for the gyroscope tilt, so accelerometer and gyroscope
  // stay allowed for our own origin. Disabling those would silently kill the
  // light-follows-tilt behaviour on every phone.
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "midi=()",
      "magnetometer=()",
      "accelerometer=(self)",
      "gyroscope=(self)",
    ].join(", "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // `.wgsl` files are compiled by @vgpu/wgsl, which resolves their import graph
  // at build time and hands vgpu one finished shader.
  turbopack: {
    rules: {
      "*.wgsl": { loaders: ["@vgpu/wgsl/loader-webpack"], as: "*.js" },
    },
  },
  webpack(config: { module?: { rules?: unknown[] } }) {
    config.module ??= {};
    config.module.rules ??= [];
    config.module.rules.push({
      test: /\.wgsl$/,
      loader: "@vgpu/wgsl/loader-webpack",
    });
    return config;
  },
};

export default nextConfig;
