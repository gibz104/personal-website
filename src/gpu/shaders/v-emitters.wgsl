// EMITTERS — the code is the light.
//
// Nothing shines on the page from outside. The band of decoding is a soft area
// light travelling through it, each falling drop is a small moving one, and
// resolved characters glow on their own. The pointer adds one more soft source
// that it carries but never sharpens — a hand cupped near the page, not a
// torch pointed at it.

import { CELL, cellAt, codeInk } from "./lab-common.wgsl";
import { sampleCell, scanBand, dropColumn } from "./decode-core.wgsl";
import { keyLight, radiance, relief } from "./light.wgsl";
import { hash2 } from "@vgpu/wgsl-std/hash";

struct Params {
  resolution: vec2f,
  pointer: vec2f,
  previousPointer: vec2f,
  click: vec2f,
  scroll: vec2f,
  time: f32,
  pointerActive: f32,
  clickAge: f32,
  intro: f32,
  speed: f32,
}

@group(0) @binding(0) var atlas: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var grid: texture_2d<u32>;
@group(0) @binding(3) var field: texture_2d<f32>;
@group(0) @binding(4) var<uniform> params: Params;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let frag = uv * params.resolution;
  let here = frag + params.scroll;
  let short = min(params.resolution.x, params.resolution.y);

  let band = scanBand(frag.y, params.resolution.y, params.time, 13.0);
  let drop = dropColumn(frag, params.resolution, params.time, CELL.x);
  let reveal = clamp(max(band, drop.x), 0.0, 1.0);

  let cell = sampleCell(atlas, samp, grid, here, reveal, params.time);

  // The pointer's own soft source: broad, weak, and it only ever adds warmth.
  let hand = keyLight(
    vec2f(0.5, 0.5), params.pointer, params.pointerActive,
    params.resolution, params.time, 0.98,
  );
  let handLight = radiance(frag, hand, params.resolution, 5.5) * params.pointerActive;

  // Light in this scene is the sum of what the page is currently doing.
  let emission = band * 0.85 + drop.y * 0.55 + handLight * 0.75;

  let lambert = relief(atlas, samp, grid, here, frag, hand, params.resolution, 0.72);
  let lit = 0.58 + emission * 1.35 + lambert * handLight * 0.75;

  var color = cell.tint * cell.ink * lit * mix(0.42, 2.15, cell.decoded);

  // Resolved characters are emitters in their own right, so a pool of their
  // own colour sits under them.
  color = color + cell.tint * cell.decoded * cell.ink * 0.30;

  // The band as a body of light, not an edge.
  color = color + vec3f(0.30, 0.48, 0.80) * pow(band, 2.2) * 0.16;
  color = color + vec3f(0.62, 0.86, 1.0) * drop.y * 0.20;
  color = color + vec3f(0.44, 0.58, 0.86) * handLight * 0.10;

  // The ground the emitters fall on. Without it their light has nothing to
  // land against and the page reads flat.
  color = color + vec3f(0.048, 0.068, 0.118) * (emission * 0.75 + handLight * 0.5);

  return vec4f(color * params.intro, 1.0);
}
