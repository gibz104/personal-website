// WAKE — the pointer disturbs the stream.
//
// The page is a falling column of text. Moving through it drags the characters
// out of line: they bend around the cursor and swing back once you leave, and
// the shear glows where the flow is worked hardest. The pointer never uncovers
// anything — the scan bar and the drops do that. It stirs.

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
  let short = min(params.resolution.x, params.resolution.y);

  // --- displacement around the cursor -------------------------------------
  let delta = frag - params.pointer;
  let dist = length(delta);
  let radius = short * 0.34;
  let falloff = 1.0 - smoothstep(0.0, radius, dist);
  let dir = delta / max(dist, 1e-4);

  // Faster movement drags harder, so a flick tears the column and a slow pass
  // only leans it.
  let drag = clamp(params.speed / 900.0, 0.0, 1.6) * params.pointerActive;

  // Push outward and swirl: outward alone reads as a lens, swirl alone as a
  // whirlpool. Together it reads like something moved through liquid.
  let tangent = vec2f(-dir.y, dir.x);
  let push = dir * falloff * falloff * short * 0.052 * (0.35 + drag);
  let swirl = tangent * falloff * falloff * short * 0.048 * drag;
  let displaced = frag + push + swirl;

  let here = displaced + params.scroll;

  // --- what makes the page readable ---------------------------------------
  let bar = scanBar(frag.y, params.resolution.y, params.time, 13.0);
  let drop = dropColumn(displaced, params.resolution, params.time, CELL.x);
  let painted = textureSampleLevel(field, samp, uv, 0.0).r * 0.30;

  let reveal = clamp(max(max(bar, drop.x), painted), 0.0, 1.0);

  // Shear: where the displacement changes fastest, the flow is being worked.
  // That band is what catches light, so the disturbance is visible as energy
  // rather than only as distortion.
  let shear = falloff * (1.0 - falloff) * 4.0 * (0.25 + drag);

  var color = renderCell(atlas, samp, grid, here, reveal, params.time, 1.0 + shear * 1.5);
  color = color + vec3f(0.34, 0.60, 1.00) * shear * 0.42 * params.pointerActive;
  color = color + vec3f(0.62, 0.86, 1.0) * drop.y * 0.22;

  // The bar itself is a light source.
  color = color + vec3f(0.42, 0.66, 1.0) * pow(bar, 3.0) * 0.30;

  return vec4f(color * params.intro, 1.0);
}
