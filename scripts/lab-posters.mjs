/** Renders a still of each hero treatment for the selection index. */
import { execFileSync } from "node:child_process";
import { existsSync, unlinkSync, mkdirSync } from "node:fs";

mkdirSync("public/lab", { recursive: true });

for (const id of ["halo", "rays", "edge"]) {
  const png = `public/lab/${id}.png`;
  const jpg = `public/lab/${id}.jpg`;
  execFileSync("npx", [
    "tsx", "scripts/preview-hero.mts",
    "--variant", id, "--px", "0.46", "--py", "0.38",
    "--width", "1600", "--height", "1000", "--out", png,
  ], { stdio: "inherit" });
  try {
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "80", png, "--out", jpg], { stdio: "ignore" });
    if (existsSync(jpg)) unlinkSync(png);
  } catch {
    // Keep the PNG where sips is unavailable.
  }
}
console.log("hero posters written");
