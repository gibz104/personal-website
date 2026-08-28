/** Renders a still of each concept for the selection index. */
import { execFileSync } from "node:child_process";
import { existsSync, unlinkSync, mkdirSync } from "node:fs";

mkdirSync("public/lab", { recursive: true });

const shots = [
  { id: "lantern", px: "0.60", py: "0.42", time: "9", steps: "70", speed: "500" },
  { id: "wake", px: "0.52", py: "0.48", time: "9", steps: "70", speed: "1100" },
  { id: "charge", px: "0.58", py: "0.45", time: "10", steps: "140", speed: "700" },
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
