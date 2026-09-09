/**
 * Renders the link-preview card.
 *
 *   npm run build:og
 *
 * The site advertised `summary_large_image` with no image behind it, so every
 * link shared anywhere previewed as an empty box. This draws the scene's own
 * arrangement at 1200x630: the mark lit from its contour, over the dark field.
 */
import { writeFileSync } from "node:fs";
import { createCanvas } from "@napi-rs/canvas";
import { registerMarkFonts } from "../src/gpu/mark/node-fonts";
import { DEFAULT_FACE } from "../src/gpu/mark/faces";
import { PROFILE } from "../src/content/profile";
import { CODE_LINES } from "../src/gpu/font/corpus";

registerMarkFonts();

const W = 1200;
const H = 630;
const family = `${DEFAULT_FACE.family.replace(/"/g, "")}, sans-serif`;

const canvas = createCanvas(W, H);
const ctx = canvas.getContext("2d");

// The board's ground.
const ground = ctx.createLinearGradient(0, 0, W, H);
ground.addColorStop(0, "#0a0f1a");
ground.addColorStop(1, "#04050a");
ctx.fillStyle = ground;
ctx.fillRect(0, 0, W, H);

/**
 * The character board, faintly, across the right of the card.
 *
 * Without it the card is a name on a gradient and could belong to anyone. The
 * board is the one thing about this site somebody might actually remember, and
 * Menlo is available to node canvas the same way the font atlas relies on it.
 */
const CELL_W = 13;
const CELL_H = 21;
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789<>[]{}()/\\*+-=#$&%@!?;:";
let seed = 20260909;
const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

ctx.font = `${CELL_H - 7}px Menlo, monospace`;
ctx.textBaseline = "alphabetic";
ctx.textAlign = "left";
for (let row = 0; row * CELL_H < H; row++) {
  for (let col = 0; col * CELL_W < W; col++) {
    const x = col * CELL_W;
    // Fade in from the left so the board never competes with the lockup.
    const reach = Math.max(0, Math.min(1, (x / W - 0.34) / 0.4));
    if (reach <= 0 || rand() > 0.55) continue;
    ctx.fillStyle = `rgba(190, 214, 245, ${(0.05 + rand() * 0.10) * reach})`;
    ctx.fillText(GLYPHS[(rand() * GLYPHS.length) | 0]!, x, row * CELL_H + CELL_H - 5);
  }
}

// A few real lines among the cipher, the way the board resolves. Rows are
// spaced rather than drawn at random, because two lines landing on the same one
// overlap into an unreadable smear.
const lines = CODE_LINES.filter((l) => l.cells.length < 46);
const rows = [4, 11, 18, 24];
for (const row of rows) {
  const line = lines[(rand() * lines.length) | 0];
  if (!line) continue;
  const text = line.cells.map((c) => String.fromCharCode(c.char)).join("");
  const x = W * 0.46 + rand() * W * 0.10;
  ctx.fillStyle = `rgba(214, 231, 255, ${0.24 + rand() * 0.14})`;
  ctx.fillText(text, x, row * CELL_H + CELL_H - 5);
}

// One light, off to the left, where the mark will sit.
const glow = ctx.createRadialGradient(W * 0.28, H * 0.46, 0, W * 0.28, H * 0.46, W * 0.42);
glow.addColorStop(0, "rgba(150, 200, 255, 0.30)");
glow.addColorStop(0.5, "rgba(70, 120, 190, 0.12)");
glow.addColorStop(1, "rgba(10, 20, 40, 0)");
ctx.fillStyle = glow;
ctx.fillRect(0, 0, W, H);

ctx.textAlign = "left";
ctx.textBaseline = "alphabetic";

// The mark, sized by cap height the way the hero and the icon are.
const probeSize = 200;
ctx.font = `${DEFAULT_FACE.weight} ${probeSize}px ${family}`;
if ("letterSpacing" in ctx) {
  (ctx as { letterSpacing: string }).letterSpacing = `${-probeSize * DEFAULT_FACE.tracking}px`;
}
const probe = ctx.measureText("RG");
const ratio = (probe.actualBoundingBoxAscent || probeSize * 0.7) / probeSize;
const markSize = (H * 0.30) / ratio;
ctx.font = `${DEFAULT_FACE.weight} ${markSize}px ${family}`;
if ("letterSpacing" in ctx) {
  (ctx as { letterSpacing: string }).letterSpacing = `${-markSize * DEFAULT_FACE.tracking}px`;
}
const mark = ctx.measureText("RG");
const markX = 84;
const markY = H * 0.44 + mark.actualBoundingBoxAscent / 2;

// Lit from its own contour, which is the whole idea of the page.
ctx.shadowColor = "rgba(150, 205, 255, 0.85)";
ctx.shadowBlur = 46;
ctx.fillStyle = "#f2f6ff";
ctx.fillText("RG", markX, markY);
ctx.shadowBlur = 0;

// Name and tagline, on the baseline grid the mark sets.
ctx.fillStyle = "#e7ebf3";
ctx.font = `600 62px ${family}`;
if ("letterSpacing" in ctx) (ctx as { letterSpacing: string }).letterSpacing = "-1px";
ctx.fillText(PROFILE.name, markX, H * 0.72);

ctx.fillStyle = "#8d97aa";
ctx.font = `400 34px ${family}`;
if ("letterSpacing" in ctx) (ctx as { letterSpacing: string }).letterSpacing = "0px";
ctx.fillText(PROFILE.tagline, markX + 4, H * 0.72 + 52);

const buffer = canvas.toBuffer("image/png");
writeFileSync(new URL("../src/app/opengraph-image.png", import.meta.url), buffer);
writeFileSync(
  new URL("../src/app/opengraph-image.alt.txt", import.meta.url),
  `${PROFILE.name}, ${PROFILE.tagline}, beside the RG monogram from the site's WebGPU scene`,
);
console.log(`wrote src/app/opengraph-image.png (${W}x${H}, ${(buffer.length / 1024).toFixed(0)}KB)`);
