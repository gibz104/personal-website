// The character board.
//
// A still field of cipher characters, flickering in place like a split-flap
// display. Each cycle a scattering of code lines lands: their characters stop
// one at a time along the line, left to right, and take their syntax colour as
// they settle. They hold, release back into noise, and a different scattering
// begins.
//
// Reveal works on whole LINES, never on regions. Revealing a rectangle settles
// the empty cells inside it too, which blanks them and cuts a visible band
// across the noise; revealing a line settles exactly the characters that belong
// to it and leaves everything around them still flickering.

import { CELL, cellAt } from "./lab-common.wgsl";
import { glyphCoverage, tokenColor } from "./glyph.wgsl";
import { hash2 } from "@vgpu/wgsl-std/hash";

// Every line runs its own clock rather than the whole page sharing one.
//
// A single global cycle meant the entire board landed together, held together,
// and left together — which left dead stretches with nothing readable at all.
// Giving each line its own phase makes reveals overlap: one lands somewhere
// roughly every half second, and there is always something in the middle of
// being read.
//
/// How often a given line comes back around.
const PERIOD: f32 = 62.0;
/// Seconds a line spends landing.
const SETTLE_T: f32 = 2.6;
/// Seconds after which it begins to fly again.
const HOLD_T: f32 = 6.4;
/// Character count a line's landing order is normalised against.
const LINE_LENGTH: f32 = 68.0;

export struct FlapState {
  /// 0 while flickering, 1 once landed on the real character.
  settled: f32,
  /// Flicker rate right now, in changes per second.
  churn: f32,
}

/// Where one cell is in its flip cycle.
export fn flapState(cell: vec4u, cellId: vec2f, time: f32) -> FlapState {
  let seed = hash2(cellId * 0.317 + vec2f(2.13, 5.71));
  var out: FlapState;
  out.settled = 0.0;
  out.churn = 13.0 + seed.y * 9.0;

  // No line behind this cell: it is pure cipher and never resolves.
  let lineId = cell.z;
  if (lineId == 0u) { return out; }

  // This line's own clock. Keyed on its id, so every character of it agrees
  // without any shared state.
  let offset = hash2(vec2f(f32(lineId) * 0.7311, 3.17)).x;
  let t = fract(time / PERIOD + offset) * PERIOD;

  // Landing order runs along the line itself, not across the screen, so a line
  // lands left to right regardless of where it sits.
  let along = clamp(f32(cell.w) / LINE_LENGTH, 0.0, 1.0);
  let lands = (along * 0.62 + seed.x * 0.24) * SETTLE_T;
  let landed = smoothstep(lands, lands + 0.16, t);

  // Released in a different order from the way it landed, so the exit does not
  // read as the entrance played backwards.
  let leaves = HOLD_T + seed.y * 1.5;
  let released = smoothstep(leaves, leaves + 0.22, t);

  out.settled = landed * (1.0 - released);

  // A flap slows as it runs out of momentum. Cells about to land flicker
  // noticeably slower than the field around them, which is what makes the stop
  // read as mechanical rather than switched. Gated on the line still being
  // active, so once it releases the cell rejoins the cipher at full rate.
  let approaching = (1.0 - clamp((lands - t) / 1.1, 0.0, 1.0)) * (1.0 - released);
  out.churn = mix(out.churn, 6.0, approaching);
  return out;
}

/// Matrix rain: a few columns carry a bright head falling through the field.
///
/// It only brightens cipher characters — it never resolves them. Letting the
/// rain reveal code as well would give the page two competing ways of saying
/// the same thing, and the flip board is the better one.
export fn rain(frag: vec2f, resolution: vec2f, time: f32) -> f32 {
  let colId = floor(frag.x / CELL.x);
  let seed = hash2(vec2f(colId, 3.71));
  let carries = step(0.87, seed.x);
  let speed = 0.085 + seed.y * 0.19;
  let span = resolution.y * 1.5;
  let head = fract(time * speed + seed.x * 19.0) * span - resolution.y * 0.28;
  let behind = head - frag.y;
  let tail = exp(-max(behind, 0.0) / (resolution.y * 0.19)) * step(0.0, behind);
  let glow = exp(-abs(behind) / (CELL.y * 2.0));
  return carries * max(tail * 0.70, glow);
}

/// A sampled cell, split so callers can light it themselves.
export struct CellSample {
  tint: vec3f,
  ink: f32,
  /// 0 while scrambled, 1 once resolved.
  decoded: f32,
}

/// Samples one cell of the board.
export fn sampleBoard(
  atlas: texture_2d<f32>,
  samp: sampler,
  grid: texture_2d<u32>,
  p: vec2f,
  cell: vec4u,
  flap: FlapState,
  time: f32,
) -> CellSample {
  let cellId = floor(p / CELL);
  let inCell = fract(p / CELL);
  let cellHash = hash2(cellId * 0.1373 + vec2f(11.7, 3.9));

  // While flying, the cell cycles glyphs at its current rate; once landed it
  // holds the real one.
  let tick = floor(time * flap.churn + cellHash.y * 40.0);
  let churned = hash2(cellId + vec2f(tick, tick * 0.37));
  let scrambled = u32(clamp(churned.x, 0.0, 0.999) * 94.0);
  let landed = flap.settled > 0.5;
  let index = select(scrambled, cell.x, landed);

  // Part of the unsettled field is blank: a fully packed board is static, and
  // the gaps are what let a landed line read as a line.
  let sparse = step(0.42, cellHash.y);
  let present = max(sparse, flap.settled);

  var out: CellSample;
  out.ink = glyphCoverage(atlas, samp, index, inCell) * present;
  out.tint = mix(vec3f(0.30, 0.36, 0.47), tokenColor(cell.y), flap.settled);
  out.decoded = flap.settled;
  return out;
}
