/**
 * Crops and resizes the About portrait.
 *
 *   npm run build:portrait -- --src "/path/to/photo.jpg"
 *
 * The full-resolution original lives outside the repo; only the cropped result
 * is committed, because a 2MB studio JPEG has no business in a git history or
 * on a phone connection. Re-run this when the photo changes.
 *
 * `--src` is required rather than defaulting to wherever the photo happens to
 * sit on one machine: a path under someone's home directory is no use to anyone
 * else and does not belong in a repository that may be read by strangers.
 */
import { writeFileSync } from "node:fs";
import { createCanvas, loadImage } from "@napi-rs/canvas";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
}

const SRC = arg("src", "");
if (!SRC) {
  console.error('usage: npm run build:portrait -- --src "/path/to/photo.jpg"');
  process.exit(1);
}
const OUT = new URL("../public/portrait.jpg", import.meta.url);
const SIZE = 512;

/**
 * Where the head sits in the source, and how much frame to take around it.
 *
 * Measured off the photo rather than assumed: the subject is left of the frame
 * centre, so a centred crop would push the face to one side of the circle.
 * These numbers must be re-measured whenever the photo changes.
 */
const HEAD_X = 787;
const HEAD_CENTRE_Y = 555;
const SIDE = 1400;

/**
 * How far down the circle the head's centre lands.
 *
 * A face sitting dead centre reads as too low once the corners are rounded
 * off, because the chin and shoulders carry visual weight the forehead does
 * not. Just above a third is where a portrait settles.
 */
const HEAD_FROM_TOP = 0.37;

const image = await loadImage(SRC);
if (SIDE > image.width || SIDE > image.height) {
  throw new Error(`a ${SIDE}px square does not fit a ${image.width}x${image.height} source`);
}

// Clamped so a head near an edge pulls the crop to that edge rather than off it.
const sx = Math.max(0, Math.min(image.width - SIDE, Math.round(HEAD_X - SIDE / 2)));
const sy = Math.max(
  0,
  Math.min(image.height - SIDE, Math.round(HEAD_CENTRE_Y - HEAD_FROM_TOP * SIDE)),
);

const canvas = createCanvas(SIZE, SIZE);
const ctx = canvas.getContext("2d");
ctx.drawImage(image, sx, sy, SIDE, SIDE, 0, 0, SIZE, SIZE);

const buffer = canvas.toBuffer("image/jpeg", 82);
writeFileSync(OUT, buffer);
console.log(
  `wrote public/portrait.jpg (${SIZE}x${SIZE}, ${(buffer.length / 1024).toFixed(0)}KB) ` +
    `from ${image.width}x${image.height} at (${sx},${sy}) +${SIDE}, ` +
    `head ${((HEAD_CENTRE_Y - sy) / SIDE * 100).toFixed(0)}% down`,
);
