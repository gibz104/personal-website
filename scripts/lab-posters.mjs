/** Renders a still of each concept for the selection index. */
import { execFileSync } from "node:child_process";
import { existsSync, unlinkSync, mkdirSync } from "node:fs";

mkdirSync("public/lab", { recursive: true });

const shots = [
  { id: "prism", px: "0.60", py: "0.44", time: "9" },
  { id: "aperture", px: "0.58", py: "0.46", time: "7" },
  { id: "decode", px: "0.56", py: "0.46", time: "6" },
];

for (const { id, px, py, time } of shots) {
  const png = `public/lab/${id}.png`;
  const jpg = `public/lab/${id}.jpg`;
  execFileSync("npx", [
    "tsx", "scripts/preview-lab.mts",
    "--concept", id, "--px", px, "--py", py, "--time", time,
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
