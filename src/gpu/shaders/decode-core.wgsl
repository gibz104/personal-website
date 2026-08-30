// The character board.
//
// Every cell holds a real character of code but shows a random glyph, flickering
// like a split-flap display. In each cycle one band of lines lands: characters
// stop one at a time, roughly left to right, and take their syntax colour as
// they settle. The band holds, releases back into noise, and the next cycle
// picks a different part of the page.
//
// This replaces the travelling band that used to do the revealing. That version
// showed the code by uncovering it, which meant a visible edge sweeping past;
// here nothing moves across the page at all — the characters themselves resolve
// where they already are.

import { CELL, cellAt } from "./lab-common.wgsl";
import { glyphCoverage, tokenColor } from "./glyph.wgsl";
import { hash2 } from "@vgpu/wgsl-std/hash";

/// Seconds for one full settle-hold-release cycle.
const CYCLE: f32 = 13.0;
/// Fraction of the cycle spent landing characters.
const SETTLE_END: f32 = 0.44;
/// Fraction of the cycle after which the band starts flying again.
const RELEASE_START: f32 = 0.82;
/// Half-height of the revealed band, in rows.
const BAND_ROWS: f32 = 3.5;

export struct FlapState {
  /// 0 while flickering, 1 once landed on the real character.
  settled: f32,
  /// Flicker rate right now, in changes per second.
  churn: f32,
}

/// Where one cell is in its flip cycle.
export fn flapState(
  cellId: vec2f,
  screenX: f32,
  resolution: vec2f,
  time: f32,
  scrollSpeed: f32,
) -> FlapState {
  let cycle = floor(time / CYCLE);
  let phase = fract(time / CYCLE);

  // The band is chosen in screen space once per cycle, then converted to a grid
  // row so that it travels upward with the text it belongs to instead of
  // sitting still while the characters slide out from under it.
  let pick = hash2(vec2f(cycle * 1.37 + 0.5, 7.31));
  // Land above or below the mark, never behind it. The monogram covers roughly
  // the middle third, and a band that settles under it is unreadable — which
  // wastes the one moment in the cycle where the code can actually be read.
  let above = 0.07 + pick.x * 0.19;
  let below = 0.72 + pick.x * 0.20;
  let centre01 = select(below, above, pick.y < 0.5);
  let centreScreenY = centre01 * resolution.y;
  let scrollAtStart = cycle * CYCLE * scrollSpeed;
  let bandRow = floor((centreScreenY + scrollAtStart) / CELL.y);

  let inBand = step(abs(cellId.y - bandRow), BAND_ROWS);

  // Each character gets its own moment to land: mostly left to right, with
  // enough jitter that the line lands like a board rather than wiping.
  let seed = hash2(cellId * 0.317 + vec2f(2.13, 5.71));
  let order = clamp(screenX / resolution.x, 0.0, 1.0) * 0.60 + seed.x * 0.32;

  let settleT = phase / SETTLE_END;
  let landed = smoothstep(order, order + 0.045, settleT);

  let releaseT = (phase - RELEASE_START) / (1.0 - RELEASE_START);
  // Released in a different order from the way it landed, so the exit does not
  // read as the entrance played backwards.
  let released = smoothstep(seed.y * 0.7, seed.y * 0.7 + 0.09, releaseT);

  var out: FlapState;
  out.settled = inBand * landed * (1.0 - released);

  // A flap slows as it runs out of momentum. Cells about to land flicker
  // noticeably slower than the field around them, which is what makes the stop
  // feel mechanical rather than switched.
  let approach = clamp((settleT - order + 0.30) / 0.30, 0.0, 1.0);
  out.churn = mix(21.0, 6.5, approach * inBand);
  return out;
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
  flap: FlapState,
  time: f32,
) -> CellSample {
  let cellId = floor(p / CELL);
  let inCell = fract(p / CELL);
  let data = cellAt(grid, p);
  let cellHash = hash2(cellId * 0.1373 + vec2f(11.7, 3.9));

  // While flying, the cell cycles glyphs at its current rate; once landed it
  // holds the real one.
  let tick = floor(time * flap.churn + cellHash.y * 40.0);
  let churned = hash2(cellId + vec2f(tick, tick * 0.37));
  let scrambled = u32(clamp(churned.x, 0.0, 0.999) * 94.0);
  let landed = flap.settled > 0.5;
  let index = select(scrambled, data.x, landed);

  // Part of the unsettled field is blank: a fully packed board is static, and
  // the gaps are what let a landed line read as a line.
  let sparse = step(0.44, cellHash.y);
  let present = max(sparse, flap.settled);

  var out: CellSample;
  out.ink = glyphCoverage(atlas, samp, index, inCell) * present;
  out.tint = mix(vec3f(0.30, 0.36, 0.47), tokenColor(data.y), flap.settled);
  out.decoded = flap.settled;
  return out;
}
