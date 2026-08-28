// RELIEF — the page is a lit surface.
//
// One soft key light, roughly overhead, that never moves far. The characters
// are given a pseudo-normal from their own coverage gradient, so their strokes
// catch the light on the side facing it and fall away on the other: the text
// stops being flat. The pointer tilts the light a fraction of the viewport,
// which reads as the page turning slightly toward you.

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

  let light = keyLight(
    vec2f(0.5, 0.24), params.pointer, params.pointerActive,
    params.resolution, params.time, 0.20,
  );

  // The page reads itself; the pointer is not part of this.
  let band = scanBand(frag.y, params.resolution.y, params.time, 13.0);
  let drop = dropColumn(frag, params.resolution, params.time, CELL.x);
  let reveal = clamp(max(band, drop.x), 0.0, 1.0);

  let cell = sampleCell(atlas, samp, grid, here, reveal, params.time);

  let key = radiance(frag, light, params.resolution, 1.35);
  let lambert = relief(atlas, samp, grid, here, frag, light, params.resolution, 0.62);

  // Ambient keeps the unlit side readable; the key gives it form. The floor
  // matters: the scrambled field is the thing being explored, so lighting must
  // shape it, never erase it.
  let lit = 0.62 + lambert * key * 1.55;

  var color = cell.tint * cell.ink * lit * mix(0.42, 2.20, cell.decoded);

  // Edge catch: where coverage changes fastest and faces the light, a thin
  // specular. This is the part that actually sells depth.
  let rim = pow(lambert, 3.0) * key * cell.ink;
  color = color + vec3f(0.62, 0.76, 1.0) * rim * 0.55;

  color = color + vec3f(0.62, 0.86, 1.0) * drop.y * 0.16;

  // The page is a surface, not a void.
  //
  // At twelve pixels a character has almost no stroke to shade, so per-glyph
  // relief alone is invisible. The key light has to fall on something — this
  // faint ground is what carries the gradient, and it is what makes the light
  // read as depth rather than as a tint on the text.
  color = color + vec3f(0.052, 0.072, 0.124) * key;

  return vec4f(color * params.intro, 1.0);
}
