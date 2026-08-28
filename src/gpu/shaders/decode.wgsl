// DECODE — a field of scrambled characters that resolves where you look.
//
// Every cell holds a real line of code, but shows a random glyph until the
// pointer's decode field reaches it. Cells flip individually against a per-cell
// threshold, so the reveal reads as decryption rather than as a fade.

import { CELL, cellAt } from "./lab-common.wgsl";
import { glyphCoverage, tokenColor } from "./glyph.wgsl";
import { hash2 } from "@vgpu/wgsl-std/hash";

struct Params {
  resolution: vec2f,
  pointer: vec2f,
  time: f32,
  pointerActive: f32,
  clickAge: f32,
  intro: f32,
}

@group(0) @binding(0) var atlas: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var grid: texture_2d<u32>;
@group(0) @binding(3) var<uniform> params: Params;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let frag = uv * params.resolution;
  let short = min(params.resolution.x, params.resolution.y);

  let drift = vec2f(
    0.5 + 0.22 * sin(params.time * 0.17),
    0.5 + 0.20 * cos(params.time * 0.13),
  ) * params.resolution;
  let center = mix(drift, params.pointer, params.pointerActive);

  let scroll = vec2f(0.0, params.time * -14.0);
  let here = frag + scroll;

  let cellId = floor(here / CELL);
  let inCell = fract(here / CELL);
  let data = cellAt(grid, here);

  // --- the decode field -------------------------------------------------
  let dist = length(frag - center);
  var reveal = 1.0 - smoothstep(short * 0.06, short * 0.32, dist);

  // A band sweeps the page on its own, so the effect announces itself before
  // the pointer is anywhere near.
  let sweep = fract(params.time * 0.085) * params.resolution.y * 1.5
    - params.resolution.y * 0.25;
  reveal = max(reveal, exp(-pow((frag.y - sweep) / (short * 0.09), 2.0)) * 0.8);

  // Click shockwave.
  let waveRadius = params.clickAge * short * 1.9;
  reveal = max(
    reveal,
    exp(-pow((dist - waveRadius) / (short * 0.075), 2.0)) * exp(-params.clickAge * 0.85),
  );
  reveal = clamp(reveal, 0.0, 1.0);

  // --- per-cell flip ----------------------------------------------------
  let cellHash = hash2(cellId * 0.1373 + vec2f(11.7, 3.9));
  // Spread the flip points so neighbours do not switch in lockstep, but keep
  // the range short: a wide spread leaves cells scrambled even at full reveal,
  // which reads as a glitch rather than as decryption.
  let threshold = 0.05 + cellHash.x * 0.52;
  let decoded = smoothstep(threshold - 0.10, threshold + 0.10, reveal);

  // Undecoded cells cycle through random glyphs.
  let churn = hash2(cellId + floor(vec2f(params.time * 9.0 + cellHash.y * 20.0)));
  let scrambled = u32(clamp(churn.x, 0.0, 0.999) * 94.0);
  let index = select(scrambled, data.x, decoded > 0.5);

  // Blank a third of the dormant cells: a fully packed noise field is visual
  // static, and the gaps are what let the resolved lines read as lines.
  let sparse = step(0.46, cellHash.y);
  let present = max(sparse, decoded);
  let ink = glyphCoverage(atlas, samp, index, inCell) * present;

  // Dim grey while scrambled, syntax colour once resolved.
  let dormant = vec3f(0.30, 0.36, 0.47);
  let tint = mix(dormant, tokenColor(data.y), decoded);
  let level = mix(0.21, 2.20, decoded);

  var color = tint * ink * level;

  // A brief flare as a cell resolves, so the flip is visible as an event.
  let edge = decoded * (1.0 - decoded) * 4.0;
  color = color + vec3f(0.75, 0.88, 1.0) * ink * edge * 0.85;

  return vec4f(color * params.intro, 1.0);
}
