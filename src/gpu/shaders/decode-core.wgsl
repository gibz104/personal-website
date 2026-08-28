// Shared machinery for the decode variants.
//
// Every variant computes a reveal field differently, then renders cells through
// the same function, so the three stay directly comparable — only the
// interaction differs, never the look of a resolved character.

import { CELL, cellAt } from "./lab-common.wgsl";
import { glyphCoverage, tokenColor } from "./glyph.wgsl";
import { hash2 } from "@vgpu/wgsl-std/hash";

/// Ambient life. About two percent of cells briefly resolve on their own,
/// at their own phase.
///
/// This replaces the full-width sweep the earlier version had. A sweep decoded
/// whole lines for free, which answered the question the cursor is supposed to
/// pose — there was no reason left to explore. A single character flickering
/// into focus does the opposite: it proves there is real code under the noise
/// without ever letting you read a line of it.
export fn glint(cellId: vec2f, time: f32) -> f32 {
  let seed = hash2(cellId * 0.0779 + vec2f(5.31, 9.17));
  let isGlinter = step(0.978, seed.x);
  let phase = fract(time * 0.55 + seed.y * 37.0);
  return isGlinter * exp(-phase * 16.0);
}

/// Renders one cell of the page at reveal level `reveal` (0..1).
export fn renderCell(
  atlas: texture_2d<f32>,
  samp: sampler,
  grid: texture_2d<u32>,
  p: vec2f,
  reveal: f32,
  time: f32,
  gain: f32,
) -> vec3f {
  let cellId = floor(p / CELL);
  let inCell = fract(p / CELL);
  let data = cellAt(grid, p);

  let cellHash = hash2(cellId * 0.1373 + vec2f(11.7, 3.9));

  // Ambient glints ride on top of whatever the pointer is doing.
  let total = clamp(max(reveal, glint(cellId, time) * 0.92), 0.0, 1.0);

  // Spread the flip points so neighbours do not switch in lockstep, but keep
  // the range short: a wide spread leaves cells scrambled even at full reveal,
  // which reads as a glitch rather than as decryption.
  let threshold = 0.05 + cellHash.x * 0.52;
  let decoded = smoothstep(threshold - 0.10, threshold + 0.10, total);

  // Undecoded cells cycle through random glyphs.
  let churn = hash2(cellId + floor(vec2f(time * 9.0 + cellHash.y * 20.0)));
  let scrambled = u32(clamp(churn.x, 0.0, 0.999) * 94.0);
  let index = select(scrambled, data.x, decoded > 0.5);

  // Blank part of the dormant field: fully packed noise is visual static, and
  // the gaps are what let resolved lines read as lines.
  let sparse = step(0.46, cellHash.y);
  let present = max(sparse, decoded);
  let ink = glyphCoverage(atlas, samp, index, inCell) * present;

  let dormant = vec3f(0.30, 0.36, 0.47);
  let tint = mix(dormant, tokenColor(data.y), decoded);
  let level = mix(0.30, 2.30, decoded);

  var color = tint * ink * level * gain;

  // A brief flare as a cell resolves, so the flip is visible as an event.
  let edge = decoded * (1.0 - decoded) * 4.0;
  color = color + vec3f(0.75, 0.88, 1.0) * ink * edge * 0.85 * gain;

  return color;
}

/// The scan bar: a hard edge of light that sweeps the page, decoding and
/// illuminating as it passes and leaving an afterglow behind it.
///
/// This is back by request. It stopped being redundant the moment the pointer
/// gave up revealing — decoding is now the page's own behaviour, and the
/// pointer does something else entirely.
export fn scanBar(y: f32, height: f32, time: f32, period: f32) -> f32 {
  let phase = fract(time / period);
  let barY = phase * (height * 1.30) - height * 0.15;
  let d = barY - y;
  // Bright leading edge, long trailing glow above it.
  let edge = exp(-abs(d) / (height * 0.009));
  let wake = exp(-max(d, 0.0) / (height * 0.22)) * step(0.0, d);
  return max(edge, wake * 0.62);
}

/// Falling one-character-wide columns of decode. Returns (decode, headGlow).
///
/// One character wide on purpose: a drop hands you a word and never a sentence,
/// so it carries the rhythm without answering anything.
export fn dropColumn(frag: vec2f, res: vec2f, time: f32, cellW: f32) -> vec2f {
  let colId = floor(frag.x / cellW);
  let seed = hash2(vec2f(colId, 3.71));
  let carries = step(0.82, seed.x);
  let speed = 0.22 + seed.y * 0.40;
  let span = res.y * 1.6;
  let head = fract(time * speed + seed.x * 17.0) * span - res.y * 0.30;
  let behind = head - frag.y;
  let short = min(res.x, res.y);
  let tail = exp(-max(behind, 0.0) / (short * 0.20)) * step(0.0, behind);
  let glow = exp(-abs(behind) / (cellW * 2.6));
  return vec2f(carries * tail, carries * glow);
}

/// Distance from `p` to the segment `a`-`b`.
///
/// Stamping along the segment the pointer travelled, rather than at its current
/// position, is what keeps a fast flick from leaving a dotted line.
export fn distToSegment(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let ab = b - a;
  let t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
  return length(p - (a + ab * t));
}
