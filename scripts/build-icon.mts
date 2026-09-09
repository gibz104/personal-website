/**
 * Renders the tab icon from the same face the hero mark uses.
 *
 *   npm run build:icon
 *
 * Drawn here rather than hand-written as SVG because an SVG favicon has to name
 * a font family and then hope the visitor's machine has it. Rasterising against
 * public/fonts/archivo.ttf means every tab shows the site's own letterforms
 * instead of whatever the browser substituted.
 */
import { writeFileSync } from "node:fs";
import { createCanvas } from "@napi-rs/canvas";
import { registerMarkFonts } from "../src/gpu/mark/node-fonts";
import { DEFAULT_FACE } from "../src/gpu/mark/faces";

registerMarkFonts();

const SIZE = 512;
const TEXT = "RG";
/** Cap height as a share of the icon. Large: at 16px there is nothing to spare. */
const CAP = 0.52;
/** Hard ceiling on the mark's width, so the letters never touch the edge. */
const MAX_INK = 0.84;

const canvas = createCanvas(SIZE, SIZE);
const ctx = canvas.getContext("2d");

/** Rounded square, the shape a tab icon is read as. */
function plate(radius: number) {
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.arcTo(SIZE, 0, SIZE, SIZE, radius);
  ctx.arcTo(SIZE, SIZE, 0, SIZE, radius);
  ctx.arcTo(0, SIZE, 0, 0, radius);
  ctx.arcTo(0, 0, SIZE, 0, radius);
  ctx.closePath();
}

/**
 * A lit field, with the mark cut out of it dark.
 *
 * This is the hero's own arrangement rather than its inverse, and it is also
 * the only version that survives a tab strip. A dark plate sits at almost the
 * same value as the browser chrome around it, so the icon reads as a smudge
 * with white letters on it; a bright one separates from dark chrome
 * immediately and still holds its shape on light chrome, where the deep blue
 * at the edge of the gradient draws the outline.
 *
 * A soft glow behind white letters was the first attempt and it does not
 * survive: by 16px it is a slightly lighter grey and nothing more. At that
 * size only value contrast reads, which is why the letters are near-black on
 * a field that runs to white rather than the other way round.
 */
ctx.save();
plate(SIZE * 0.22);
ctx.clip();
const field = ctx.createRadialGradient(
  SIZE * 0.34, SIZE * 0.28, 0,
  SIZE * 0.5, SIZE * 0.5, SIZE * 0.92,
);
field.addColorStop(0, "#ffffff");
field.addColorStop(0.35, "#bcd9f7");
field.addColorStop(0.75, "#5b8fc9");
field.addColorStop(1, "#22406b");
ctx.fillStyle = field;
ctx.fillRect(0, 0, SIZE, SIZE);
ctx.restore();

// Solve for the size that lands the cap height on target, the same way the
// hero does, so the icon and the mark are the same letterforms at any scale.
const face = DEFAULT_FACE;
const apply = (size: number) => {
  ctx.font = `${face.weight} ${size}px ${face.family.replace(/"/g, "")}, sans-serif`;
  if ("letterSpacing" in ctx) {
    (ctx as { letterSpacing: string }).letterSpacing = `${-size * face.tracking}px`;
  }
  return ctx.measureText(TEXT);
};

const PROBE = 200;
const probe = apply(PROBE);
const ratio = (probe.actualBoundingBoxAscent || PROBE * 0.7) / PROBE;
let fontSize = (SIZE * CAP) / ratio;
let metrics = apply(fontSize);

// Never let the letters touch the plate edge.
const maxInk = SIZE * MAX_INK;
const inkWidth = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
if (inkWidth > maxInk) {
  fontSize *= maxInk / inkWidth;
  metrics = apply(fontSize);
}

// Centre on the ink, not on the anchor: negative tracking and the face's own
// side bearings both pull the drawn glyphs off the alignment point.
const left = metrics.actualBoundingBoxLeft;
const right = metrics.actualBoundingBoxRight;
const ascent = metrics.actualBoundingBoxAscent;
const descent = metrics.actualBoundingBoxDescent;
const x = (SIZE - (left + right)) / 2 + left;
const y = (SIZE - (ascent + descent)) / 2 + ascent;

ctx.textAlign = "left";
ctx.textBaseline = "alphabetic";
ctx.fillStyle = "#05070d";
ctx.fillText(TEXT, x, y);

// Darker rim, drawn on the path so half of it falls outside and is clipped.
// It stops the pale edge of the field from dissolving into a light tab strip.
plate(SIZE * 0.22);
ctx.strokeStyle = "rgba(10, 26, 48, 0.55)";
ctx.lineWidth = SIZE * 0.03;
ctx.stroke();

const out = new URL("../src/app/icon.png", import.meta.url);
writeFileSync(out, canvas.toBuffer("image/png"));
console.log(
  `wrote src/app/icon.png (${SIZE}x${SIZE}, ${face.name} ${face.weight}, cap ${(ascent / SIZE * 100).toFixed(0)}%)`,
);
