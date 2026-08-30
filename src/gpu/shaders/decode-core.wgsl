// The character board.
//
// A still field of cipher characters, flickering in place like a split-flap
// display. Code lines arrive from the procedural placement in lab-common: their
// characters stop one at a time along the line, left to right, take their
// syntax colour as they settle, hold, and then fly again. Reveal works on whole
// lines, never on regions — settling a rectangle blanks the empty cells inside
// it and cuts a visible stripe across the noise.

import { CELL, Placement } from "./lab-common.wgsl";
import { glyphCoverage, tokenColor } from "./glyph.wgsl";
import { hash2 } from "@vgpu/wgsl-std/hash";

/// Seconds a line spends landing.
const SETTLE_T: f32 = 2.6;
/// Seconds after which it begins to fly again.
const HOLD_T: f32 = 6.6;

export struct FlapState {
  /// 0 while flickering, 1 once landed on the real character.
  settled: f32,
  /// Flicker rate right now, in changes per second.
  churn: f32,
}

/// Where one cell is in its flip cycle.
export fn flapState(place: Placement, cellId: vec2f) -> FlapState {
  let seed = hash2(cellId * 0.317 + vec2f(2.13, 5.71));
  var out: FlapState;
  out.settled = 0.0;
  out.churn = 13.0 + seed.y * 9.0;

  // No line at this cell: pure cipher, never resolves.
  if (place.present < 0.5) { return out; }

  let t = place.local;

  // Landing order runs along the line itself, not across the screen, so a line
  // lands left to right regardless of where it sits.
  let lands = (place.along * 0.62 + seed.x * 0.24) * SETTLE_T;
  let landed = smoothstep(lands, lands + 0.16, t);

  // Released in a different order from the way it landed, so the exit does not
  // read as the entrance played backwards.
  let leaves = HOLD_T + place.seed * 1.6;
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

/// How present a cell's cipher character is right now.
///
/// The gaps in the field used to come from a fixed per-cell hash, which meant
/// the same holes sat in the same places forever and the board read as a static
/// image with some characters missing. Each cell now drifts in and out on its
/// own slow schedule, interpolated between two draws so it fades rather than
/// blinks — the holes wander, and the field looks alive even where nothing is
/// being revealed.
fn cipherPresence(cellId: vec2f, time: f32) -> f32 {
  let seed = hash2(cellId * 0.2137 + vec2f(7.13, 1.97));
  let t = time / (5.0 + seed.x * 7.0) + seed.y * 13.0;
  let slot = floor(t);
  let a = hash2(cellId * 0.611 + vec2f(slot, slot * 0.37)).x;
  let b = hash2(cellId * 0.611 + vec2f(slot + 1.0, (slot + 1.0) * 0.37)).x;
  let blend = mix(a, b, smoothstep(0.0, 1.0, fract(t)));
  return smoothstep(0.36, 0.52, blend);
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
  place: Placement,
  flap: FlapState,
  p: vec2f,
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
  let index = select(scrambled, place.glyph, landed);

  // A landed character is always drawn; the cipher around it breathes.
  let present = max(cipherPresence(cellId, time), flap.settled);

  var out: CellSample;
  out.ink = glyphCoverage(atlas, samp, index, inCell) * present;
  out.tint = mix(vec3f(0.30, 0.36, 0.47), tokenColor(place.token), flap.settled);
  out.decoded = flap.settled;
  return out;
}
