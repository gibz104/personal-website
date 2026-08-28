// The background plate: the character matrix, and the band of code behind it.
//
// Deliberately unlit. All the light in this scene comes from behind the mark,
// so the plate stays flat and dark — it is what the flare falls on, not a
// second thing competing for attention.

import { CELL } from "./lab-common.wgsl";
import { sampleCell, scanBand, dropColumn } from "./decode-core.wgsl";

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

  let band = scanBand(frag.y, params.resolution.y, params.time, 13.0);
  let drop = dropColumn(frag, params.resolution, params.time, CELL.x);
  let reveal = clamp(max(band, drop.x), 0.0, 1.0);

  let cell = sampleCell(atlas, samp, grid, here, reveal, params.time);

  var color = cell.tint * cell.ink * mix(0.42, 2.05, cell.decoded);
  color = color + vec3f(0.62, 0.86, 1.0) * drop.y * 0.14;

  return vec4f(color * params.intro, 1.0);
}
