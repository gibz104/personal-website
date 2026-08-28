// LANTERN — the pointer is a light, not a window.
//
// The page decodes on its own: a scan bar sweeps it, drops fall through it, and
// characters glint. What the pointer controls is the lighting. Volumetric
// shafts are marched through the glyphs from every pixel toward the cursor, so
// the gaps between characters become beams and lit code burns in its syntax
// colour. Nothing is uncovered by pointing at it — it is lit.

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

const STEPS: i32 = 34;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let frag = uv * params.resolution;
  let short = min(params.resolution.x, params.resolution.y);
  let here = frag + params.scroll;

  // Before anyone touches it the lamp drifts, so the page is already lit and
  // already moving.
  let drift = vec2f(
    0.5 + 0.26 * sin(params.time * 0.17),
    0.44 + 0.20 * cos(params.time * 0.13),
  ) * params.resolution;
  let light = mix(drift, params.pointer, params.pointerActive);

  // --- what makes the page readable, none of it the pointer's doing --------
  let bar = scanBar(frag.y, params.resolution.y, params.time, 13.0);
  let drop = dropColumn(frag, params.resolution, params.time, CELL.x);
  let painted = textureSampleLevel(field, samp, uv, 0.0).r * 0.35;

  // --- volumetric shafts through the glyphs -------------------------------
  let toLight = light - frag;
  let stepVec = toLight / f32(STEPS);
  var samplePos = frag;
  var transmittance = 1.0;
  var shafts = 0.0;
  for (var i = 0; i < STEPS; i = i + 1) {
    samplePos = samplePos + stepVec;
    transmittance = transmittance * (1.0 - codeInk(atlas, samp, grid, samplePos + params.scroll) * 0.88);
    shafts = shafts + exp(-length(samplePos - light) / (short * 0.15)) * transmittance;
  }
  shafts = shafts / f32(STEPS);

  let dist = length(frag - light);
  // Every ray ends at the lamp, so without attenuating by the fragment's own
  // distance the whole frame washes to grey.
  let reach = exp(-dist / (short * 0.30));
  let near = exp(-dist / (short * 0.28));
  let core = exp(-dist / (short * 0.026));

  // Light nudges decoding only right at the core, so pointing somewhere is
  // rewarded without turning the lamp back into a reveal tool.
  let reveal = clamp(max(max(bar, drop.x), max(painted, core * 0.85)), 0.0, 1.0);

  var color = renderCell(atlas, samp, grid, here, reveal, params.time, 0.55 + near * 2.4);
  color = color + vec3f(0.50, 0.68, 1.00) * shafts * reach * 1.9;
  color = color + vec3f(0.62, 0.86, 1.0) * drop.y * 0.20;
  color = color + vec3f(1.0, 0.94, 0.86) * core * 1.5;

  return vec4f(color * params.intro, 1.0);
}
