// The background plate: the character matrix, and the band of code behind it.
//
// Deliberately unlit. All the light in this scene comes from behind the mark,
// so the plate stays flat and dark — it is what the flare falls on, not a
// second thing competing for attention.

import { sampleCell, scanBand } from "./decode-core.wgsl";

struct Params {
  resolution: vec2f,
  scroll: vec2f,
  time: f32,
  intro: f32,
}

@group(0) @binding(0) var atlas: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var grid: texture_2d<u32>;
@group(0) @binding(3) var<uniform> params: Params;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let frag = uv * params.resolution;
  let here = frag + params.scroll;

  // No falling streaks. They were the second-brightest thing in the frame and
  // pulled the eye off the mark, which is the only thing here that should be
  // asking for attention.
  let reveal = clamp(scanBand(frag.y, params.resolution.y, params.time, 13.0), 0.0, 1.0);

  let cell = sampleCell(atlas, samp, grid, here, reveal, params.time);
  let color = cell.tint * cell.ink * mix(0.40, 1.85, cell.decoded);

  return vec4f(color * params.intro, 1.0);
}
