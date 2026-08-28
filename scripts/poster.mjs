/**
 * Renders the no-WebGPU fallback poster from the real simulation.
 *
 * The fallback is not a mockup: it is a settled frame of the same shaders the
 * live field runs, so browsers without WebGPU get the actual artwork.
 * Run locally with `npm run poster` and commit the result.
 */
import { execFileSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";

const png = "public/field-poster.png";
const jpg = "public/field-poster.jpg";

execFileSync(
  "npx",
  [
    "tsx", "scripts/preview.mts",
    "--scene", "field",
    "--steps", "900",
    "--width", "1920",
    "--height", "1080",
    "--out", png,
  ],
  { stdio: "inherit" },
);

// sips is macOS-only; the PNG is a fine fallback everywhere else.
try {
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "82", png, "--out", jpg], {
    stdio: "ignore",
  });
  if (existsSync(jpg)) unlinkSync(png);
  console.log(`wrote ${jpg}`);
} catch {
  console.log(`wrote ${png} (install sips or convert manually for a smaller jpg)`);
}
