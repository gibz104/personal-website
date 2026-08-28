// TRAIL — the page remembers where you have been.
//
// The cursor paints into a persistent field that fades over several seconds,
// so exploring accumulates: you can clear a region, write across the screen,
// and watch your own path close behind you. Speed matters — a flick leaves a
// thin streak, a slow pass opens a broad bloom.

import { CELL } from "./lab-common.wgsl";
import { renderCell } from "./decode-core.wgsl";
import { hash2 } from "@vgpu/wgsl-std/hash";

struct Params {
  resolution: vec2f,
  pointer: vec2f,
  click: vec2f,
  time: f32,
  pointerActive: f32,
  clickAge: f32,
  intro: f32,
  dwell: f32,
  speed: f32,
  pinnedRow: f32,
}

@group(0) @binding(0) var atlas: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var grid: texture_2d<u32>;
@group(0) @binding(3) var field: texture_2d<f32>;
@group(0) @binding(4) var<uniform> params: Params;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let frag = uv * params.resolution;
  let short = min(params.resolution.x, params.resolution.y);

  // The persistent field is the whole mechanic here.
  let painted = textureSampleLevel(field, samp, uv, 0.0).r;

  var color = renderCell(atlas, samp, grid, frag, painted, params.time, 1.0);

  // A soft halo on the cursor itself, so the brush has a visible tip.
  let d = length(frag - params.pointer);
  let tip = exp(-d / (short * 0.045)) * params.pointerActive;
  color = color + vec3f(0.30, 0.46, 0.68) * tip * 0.22;

  return vec4f(color * params.intro, 1.0);
}
