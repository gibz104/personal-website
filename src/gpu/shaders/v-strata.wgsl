// STRATA — depth by parallax.
//
// Three planes of code at different scales. The pointer moves the viewpoint
// rather than the content, so the planes slide against each other and the page
// gains real thickness. The key light falls off with depth, so the far planes
// sit back in cool shadow and the near one carries the detail.

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

/// One plane of code, offset for parallax and dimmed by its depth.
fn plane(
  frag: vec2f,
  parallax: vec2f,
  scale: f32,
  depth: f32,
  reveal: f32,
  light: vec2f,
) -> vec3f {
  let p = (frag + parallax) / scale + params.scroll * mix(0.45, 1.0, 1.0 - depth);
  let cell = sampleCell(atlas, samp, grid, p, reveal, params.time + depth * 7.0);

  let key = radiance(frag, light, params.resolution, 1.5 + depth * 2.2);
  let lit = 0.58 + key * 1.20;

  // Far planes lose saturation and gain the blue of distance.
  let cooled = mix(cell.tint, vec3f(0.30, 0.42, 0.62), depth * 0.72);
  let level = mix(0.42, 2.10, cell.decoded) * mix(1.0, 0.34, depth);

  return cooled * cell.ink * lit * level;
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let frag = uv * params.resolution;

  let light = keyLight(
    vec2f(0.5, 0.26), params.pointer, params.pointerActive,
    params.resolution, params.time, 0.16,
  );

  // Viewpoint offset. Small: this is a lean, not a pan.
  let look = (params.pointer - params.resolution * 0.5) * 0.045 * params.pointerActive;

  let band = scanBand(frag.y, params.resolution.y, params.time, 13.0);
  let drop = dropColumn(frag, params.resolution, params.time, CELL.x);
  let near = clamp(max(band, drop.x), 0.0, 1.0);

  // Deeper planes decode less, so the eye stays on the front sheet.
  var color = plane(frag, look * -2.4, 1.85, 1.0, near * 0.55, light);
  color = color + plane(frag, look * -1.1, 1.32, 0.55, near * 0.8, light);
  color = color + plane(frag, vec2f(0.0), 1.0, 0.0, near, light);

  color = color + vec3f(0.62, 0.86, 1.0) * drop.y * 0.14;

  // A lit ground behind every sheet, so the planes have something to sit on.
  color = color + vec3f(0.046, 0.064, 0.112) * radiance(frag, light, params.resolution, 1.9);

  return vec4f(color * params.intro, 1.0);
}
