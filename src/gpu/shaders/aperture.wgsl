// APERTURE — frosted glass over a page of code.
//
// The surface is opaque until you touch it. The pointer is a lens: inside it
// the frost clears, the code magnifies, and the glass splits colour at the rim.
// Clicking sends a ring out across the sheet.

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

fn inkAt(p: vec2f) -> f32 {
  let data = cellAt(grid, p);
  return glyphCoverage(atlas, samp, data.x, fract(p / CELL));
}

/// Eight-tap ring softening.
///
/// Four axis-aligned taps at this radius read as double vision rather than as
/// blur — the diagonals are what turn it into frost.
fn frostedInk(p: vec2f, spread: f32) -> f32 {
  let d = spread * 0.707;
  var total = inkAt(p + vec2f(spread, 0.0));
  total = total + inkAt(p + vec2f(-spread, 0.0));
  total = total + inkAt(p + vec2f(0.0, spread));
  total = total + inkAt(p + vec2f(0.0, -spread));
  total = total + inkAt(p + vec2f(d, d));
  total = total + inkAt(p + vec2f(-d, d));
  total = total + inkAt(p + vec2f(d, -d));
  total = total + inkAt(p + vec2f(-d, -d));
  return total * 0.125;
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let frag = uv * params.resolution;
  let short = min(params.resolution.x, params.resolution.y);

  let drift = vec2f(
    0.5 + 0.20 * sin(params.time * 0.23),
    0.48 + 0.14 * cos(params.time * 0.19),
  ) * params.resolution;
  let center = mix(drift, params.pointer, params.pointerActive);

  let scroll = vec2f(params.time * 4.0, params.time * -9.0);

  let delta = frag - center;
  let dist = length(delta);
  let dir = delta / max(dist, 1e-4);
  let radius = short * 0.26;

  // Lens profile: 1 at the centre, 0 at the rim.
  let lens = smoothstep(0.0, 1.0, clamp(1.0 - dist / radius, 0.0, 1.0));

  // Pull samples inward so the code magnifies under the glass. Kept gentle:
  // heavy magnification blows one blank row up into a void at the centre.
  let magnified = center + dir * dist * (1.0 - lens * 0.26);
  let sourceP = magnified + scroll;

  // Colour splits hardest at the rim, where a real lens bends most.
  let rim = lens * (1.0 - lens) * 4.0;
  let split = dir * rim * short * 0.0032;

  let data = cellAt(grid, sourceP);
  let tint = tokenColor(data.y);

  let inkR = inkAt(sourceP + split);
  let inkG = inkAt(sourceP);
  let inkB = inkAt(sourceP - split);
  let sharp = vec3f(inkR, inkG, inkB);

  // Expanding ring from the last click, riding over the frost.
  let waveRadius = params.clickAge * short * 1.7;
  let wave = exp(-pow((dist - waveRadius) / (short * 0.07), 2.0))
    * exp(-params.clickAge * 1.0);

  let reveal = clamp(lens + wave * 0.9, 0.0, 1.0);

  // Frost: softened ink, barely lit, plus a faint cool sheen so the sheet reads
  // as a surface rather than as black.
  let frost = frostedInk(frag + scroll, 1.6 + 1.6 * (1.0 - reveal));
  let sheen = 0.020 + 0.014 * sin(frag.y * 0.006 + params.time * 0.5);

  // Frost has to be visible or there is nothing to suggest wiping it.
  var color = vec3f(0.16, 0.20, 0.30) * frost * (0.55 + 0.30 * (1.0 - reveal));
  color = color + vec3f(0.07, 0.10, 0.17) * sheen;

  // The glass itself: a faint body so the lens reads as an object, not a hole.
  color = color + vec3f(0.11, 0.17, 0.28) * lens * lens * 0.55;

  // Revealed code, in its syntax colour.
  color = color + tint * sharp * reveal * 3.4;

  // Rim highlight: the edge of the glass catches light.
  color = color + vec3f(0.55, 0.75, 1.0) * rim * 0.42;

  return vec4f(color * params.intro, 1.0);
}
