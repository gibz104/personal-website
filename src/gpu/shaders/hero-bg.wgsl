// The background plate: the character board.
//
// Deliberately unlit. All the light in this scene comes from the mark, so the
// plate stays flat and dark — it is what the flare falls on, not a second thing
// competing for attention.

import { CELL } from "./lab-common.wgsl";
import { flapState, sampleBoard } from "./decode-core.wgsl";

struct Params {
  resolution: vec2f,
  scroll: vec2f,
  time: f32,
  scrollSpeed: f32,
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
  let cellId = floor(here / CELL);

  let flap = flapState(cellId, frag.x, params.resolution, params.time, params.scrollSpeed);
  let cell = sampleBoard(atlas, samp, grid, here, flap, params.time);

  // Landed characters brighten as well as change colour, so the settled line
  // lifts out of the field rather than only tinting.
  let color = cell.tint * cell.ink * mix(0.40, 1.95, cell.decoded);

  return vec4f(color * params.intro, 1.0);
}
