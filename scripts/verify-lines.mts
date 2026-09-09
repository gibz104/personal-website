/**
 * Asserts that the character board never shows a broken line.
 *
 * Renders the placement layout at one cell per pixel and checks every row: the
 * cells a line covers must be contiguous, and must run from its first character
 * to its last. A line overwritten in the middle by another placement, or clipped
 * by the viewport edge, fails here — both of which have shipped before and both
 * of which are easy to miss by eye, because a half-line still looks like code.
 */
import { createCanvas } from "@napi-rs/canvas";
import { resolveShader } from "@vgpu/wgsl/runtime";
import * as node from "vgpu/node";
import {
  boardCellSize,
  buildCorpusTexture,
  CORPUS_COUNT,
  CORPUS_HEIGHT,
  CORPUS_WIDTH,
  measureCorpus,
  usableLineCount,
} from "../src/gpu/font/page";
import { CODE_LINES } from "../src/gpu/font/corpus";

void createCanvas;

/**
 * Viewport in backing pixels, and the device pixel ratio behind it.
 *
 * The small end matters as much as the large: 320 CSS pixels is still a phone
 * in use, and landscape puts the short edge at 390, which is what the cell
 * shrink keys off. A board that places a clipped line there is as broken as
 * one that does it on a desktop.
 */
const VIEWPORTS: readonly (readonly [number, number, number])[] = [
  [320, 568, 1],
  [640, 1136, 2],
  [844, 390, 1],
  [390, 844, 1],
  [780, 1688, 2],
  [768, 1024, 1],
  [1440, 900, 1],
  [2880, 1800, 2],
  [2560, 1440, 1],
];
const TIMES = [0, 3.5, 11, 29, 52, 87, 140, 233];

const shader = await resolveShader({
  entry: new URL("../src/gpu/shaders/debug-placement.wgsl", import.meta.url).pathname,
});

const gpu = await node.init({ label: "verify-lines" });

const corpus = gpu.gpu.createTexture({
  label: "corpus",
  size: [CORPUS_WIDTH, CORPUS_HEIGHT],
  format: "rgba8uint",
  usage: 0x02 | 0x04,
});
gpu.gpu.queue.writeTexture(
  { texture: corpus },
  buildCorpusTexture(),
  { bytesPerRow: CORPUS_WIDTH * 4, rowsPerImage: CORPUS_HEIGHT },
  [CORPUS_WIDTH, CORPUS_HEIGHT],
);

let failures = 0;
let rowsChecked = 0;
let linesChecked = 0;
const fits: string[] = [];

for (const [vw, vh, dpr] of VIEWPORTS) {
  const cell = boardCellSize(vw, vh, dpr);
  const cols = Math.floor(vw / cell[0]);
  const rows = Math.floor(vh / cell[1]);
  const usable = usableLineCount(vw / cell[0]);
  // A viewport too narrow for any line leaves the board as pure cipher with no
  // readable code in it. That is a rendering the site should never ship, so it
  // is reported here rather than passing silently for want of anything to check.
  if (usable === 0) {
    failures++;
    console.log(`  no line fits ${vw}x${vh} @${dpr}x (${cols} columns)`);
  }
  fits.push(`${vw}x${vh}@${dpr}x ${cols}x${rows} cells, ${usable}/${CORPUS_COUNT} lines fit`);

  // One pixel per cell: sample the centre of each cell exactly.
  const target = node.target(gpu, { size: [cols, rows], format: "rgba8unorm" });
  const effect = node.effect(gpu, shader.wgsl, { label: "placement" });
  effect.set({ corpus });

  for (const time of TIMES) {
    effect.set({
      params: {
        resolution: [cols, rows],
        cell: [1, 1],
        time,
        usableCount: usable,
        rowOffset: 0,
      },
    });
    effect.draw(target);
    const px = await target.read();

    for (let row = 0; row < rows; row++) {
      rowsChecked++;
      // Walk the row, collecting each contiguous covered run.
      //
      // Within one line `along` climbs from 0 to nearly 1 in even steps. Three
      // things can go wrong, and all three are checked, because the obvious one
      // alone is not enough: two overlapping lines still form a contiguous run
      // that ends at along = 1, so "it reached the end" proves nothing. What
      // gives an overlap away is `along` jumping backwards partway through,
      // where the second line restarts at its own first character.
      let runStart = -1;
      let first = -1;
      let last = -1;
      let wentBackwards = false;

      const closeRun = (end: number) => {
        if (runStart < 0) return;
        linesChecked++;
        const why =
          wentBackwards ? "restarts mid-run (two lines overlap)"
          : first > 0.04 ? `starts at along=${first.toFixed(2)}, not its first character`
          : last < 0.90 ? `stops at along=${last.toFixed(2)}, cut short`
          : "";
        if (why) {
          failures++;
          if (failures <= 8) {
            console.log(`  broken: ${vw}x${vh} t=${time}s row ${row} cols ${runStart}..${end - 1}: ${why}`);
          }
        }
        runStart = -1;
        first = -1;
        last = -1;
        wentBackwards = false;
      };

      for (let col = 0; col < cols; col++) {
        const i = (row * cols + col) * 4;
        const present = px[i + 2]! > 127;
        const along = px[i + 1]! / 255;
        if (present) {
          if (runStart < 0) {
            runStart = col;
            first = along;
          } else if (along < last - 0.01) {
            wentBackwards = true;
          }
          last = along;
        } else {
          closeRun(col);
        }
      }
      closeRun(cols);
    }
  }
}

await gpu.settled();
gpu.dispose();

for (const line of fits) console.log(`  ${line}`);

const mix = measureCorpus();
console.log(
  "language share: " +
    Object.entries(mix)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${(v * 100).toFixed(0)}%`)
      .join(", "),
);

// Every line must stand on its own: no block openers, no indented fragments.
const dangling = CODE_LINES.filter((line) => {
  const text = line.cells.map((c) => String.fromCharCode(c.char)).join("");
  return /[:{]\s*$/.test(text) || /^\s/.test(text);
});
if (dangling.length > 0) {
  failures += dangling.length;
  for (const line of dangling.slice(0, 5)) {
    console.log(`  dangling: ${line.cells.map((c) => String.fromCharCode(c.char)).join("")}`);
  }
}

console.log(
  `checked ${linesChecked} line runs across ${rowsChecked} rows ` +
    `(${VIEWPORTS.length} viewports x ${TIMES.length} moments)`,
);
if (failures > 0) {
  console.log(`FAIL: ${failures} broken line runs`);
  process.exit(1);
}
console.log("PASS: every placed line appears whole");
