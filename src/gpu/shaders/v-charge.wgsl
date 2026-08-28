// CHARGE — the pointer kindles.
//
// Moving deposits energy into a field that bleeds outward and decays. Where it
// crosses the ignition threshold a cell catches: it resolves, flares, and hands
// charge to its neighbours, so a stroke keeps burning outward after you have
// gone. The pointer plants fires; it does not open windows.

import { CELL, cellAt, codeInk } from "./lab-common.wgsl";
import { renderCell, scanBar, dropColumn } from "./decode-core.wgsl";
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

  // The persistent field carries the charge; the reveal pass does the spreading.
  let charge = textureSampleLevel(field, samp, uv, 0.0).r;

  let bar = scanBar(frag.y, params.resolution.y, params.time, 13.0);
  let drop = dropColumn(frag, params.resolution, params.time, CELL.x);

  // Ignition is a threshold, not a ramp: below it nothing happens, above it the
  // cell is fully alight. That edge is what makes the spread read as fire
  // travelling rather than as a glow expanding.
  //
  // The threshold is jittered per cell, because a uniform one gives the burn a
  // clean elliptical edge — a hot smear rather than something catching.
  let jitter = hash2(floor(here / CELL) * 0.19 + vec2f(2.71, 8.33)).x;
  let threshold = 0.17 + jitter * 0.26;
  let ignition = smoothstep(threshold, threshold + 0.13, charge);

  let reveal = clamp(max(max(bar, drop.x), ignition), 0.0, 1.0);

  // Embers run hot at the front and cool behind it.
  let front = ignition * (1.0 - ignition) * 4.0;
  let ember = mix(vec3f(1.00, 0.52, 0.18), vec3f(0.72, 0.88, 1.0), clamp(charge * 1.1, 0.0, 1.0));

  var color = renderCell(atlas, samp, grid, here, reveal, params.time, 1.0 + ignition * 1.3);
  color = color + ember * front * 0.85;
  color = color + ember * ignition * 0.22;
  color = color + vec3f(0.62, 0.86, 1.0) * drop.y * 0.20;
  color = color + vec3f(0.42, 0.66, 1.0) * pow(bar, 3.0) * 0.28;

  return vec4f(color * params.intro, 1.0);
}
