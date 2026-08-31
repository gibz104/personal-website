/**
 * Registers the display faces with @napi-rs/canvas so the headless preview
 * rasterises the mark from the same files the browser does.
 *
 * Node-only: imported by the preview and verification scripts, never by the app.
 */
import { GlobalFonts } from "@napi-rs/canvas";
import { existsSync } from "node:fs";
import { MARK_FACES } from "./faces";

let done = false;

export function registerMarkFonts(root = "public/fonts"): void {
  if (done) return;
  done = true;
  for (const face of MARK_FACES) {
    if (!face.file) continue;
    const path = `${root}/${face.file}.ttf`;
    if (!existsSync(path)) continue;
    // The registered name must match the CSS family the shared drawing code
    // asks for, quotes stripped.
    GlobalFonts.registerFromPath(path, face.family.replace(/"/g, ""));
  }
}
