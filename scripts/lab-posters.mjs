/** Renders a still of each concept for the selection index. */
import { execFileSync } from "node:child_process";
import { existsSync, unlinkSync, mkdirSync } from "node:fs";

mkdirSync("public/lab", { recursive: true });

const shots = [
  { id: "trail", px: "0.60", py: "0.44", time: "9", steps: "120", dwell: "0.3", pinned: "-1" },
  { id: "focus", px: "0.55", py: "0.52", time: "8", steps: "60", dwell: "0.85", pinned: "12" },
  { id: "cascade", px: "0.52", py: "0.45", time: "11", steps: "90", dwell: "0.3", pinned: "-1" },
];

for (const { id, px, py, time, steps, dwell, pinned } of shots) {
  const png = `public/lab/${id}.png`;
  const jpg = `public/lab/${id}.jpg`;
  execFileSync("npx", [
    "tsx", "scripts/preview-lab.mts",
    "--concept", id, "--px", px, "--py", py, "--time", time,
    "--steps", steps, "--dwell", dwell, "--pinned", pinned,
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
