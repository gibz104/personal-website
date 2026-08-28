/** Renders a still of each concept for the selection index. */
import { execFileSync } from "node:child_process";
import { existsSync, unlinkSync, mkdirSync } from "node:fs";

mkdirSync("public/lab", { recursive: true });

const shots = [
  { id: "relief", px: "0.70", py: "0.30", time: "9", steps: "50", speed: "400" },
  { id: "strata", px: "0.70", py: "0.30", time: "9", steps: "50", speed: "400" },
  { id: "emitters", px: "0.70", py: "0.30", time: "9", steps: "50", speed: "400" },
];

for (const { id, px, py, time, steps, speed } of shots) {
  const png = `public/lab/${id}.png`;
  const jpg = `public/lab/${id}.jpg`;
  execFileSync("npx", [
    "tsx", "scripts/preview-lab.mts",
    "--concept", id, "--px", px, "--py", py, "--time", time,
    "--steps", steps, "--speed", speed,
    "--width", "1600", "--height", "1000", "--out", png,
  ], { stdio: "inherit" });
  try {
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "80", png, "--out", jpg], { stdio: "ignore" });
    if (existsSync(jpg)) unlinkSync(png);
  } catch {
    // Keep the PNG where sips is unavailable.
  }
}
console.log("lab posters written");
