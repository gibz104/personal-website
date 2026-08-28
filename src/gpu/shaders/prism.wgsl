// PRISM — a wall of code, backlit.
//
// Volumetric shafts are marched in screen space from each pixel toward the
// light: glyphs occlude the path, so the gaps between characters become the
// beams. The light follows the pointer, and drifts on its own before anyone
// touches it.

import { CELL, cellAt, codeInk } from "./lab-common.wgsl";
import { glyphCoverage, tokenColor } from "./glyph.wgsl";

struct Params {
  resolution: vec2f,
  pointer: vec2f,
  time: f32,
  pointerActive: f32,
  clickAge: f32,
  intro: f32,
}

@group(0) @binding(0) var atlas: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var grid: texture_2d<u32>;
@group(0) @binding(3) var<uniform> params: Params;

const STEPS: i32 = 44;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let frag = uv * params.resolution;
  let short = min(params.resolution.x, params.resolution.y);

  // Before the pointer arrives the light drifts, so the page is already moving
  // and reads as something to play with rather than a still image.
  let drift = vec2f(
    0.5 + 0.24 * sin(params.time * 0.19),
    0.44 + 0.18 * cos(params.time * 0.15),
  ) * params.resolution;
  let light = mix(drift, params.pointer, params.pointerActive);

  // The wall creeps, so shafts sweep even when the light is still.
  let scroll = vec2f(params.time * 7.0, params.time * -2.5);

  // March toward the light accumulating transmittance through the glyphs.
  let toLight = light - frag;
  let stepVec = toLight / f32(STEPS);
  var samplePos = frag;
  var transmittance = 1.0;
  var shafts = 0.0;
  for (var i = 0; i < STEPS; i = i + 1) {
    samplePos = samplePos + stepVec;
    let ink = codeInk(atlas, samp, grid, samplePos + scroll);
    transmittance = transmittance * (1.0 - ink * 0.90);
    let d = length(samplePos - light);
    // Emissive falloff around the source; the sum of it along the ray is the beam.
    shafts = shafts + exp(-d / (short * 0.155)) * transmittance;
  }
  shafts = shafts / f32(STEPS);

  // The glyph under this pixel, lit by how close it is to the source.
  let here = frag + scroll;
  let data = cellAt(grid, here);
  let ink = glyphCoverage(atlas, samp, data.x, fract(here / CELL));
  let tint = tokenColor(data.y);

  let dist = length(frag - light);
  // Every ray ends at the light, so without this each pixel picks up the
  // source's glow and the whole frame washes to grey. Attenuating by the
  // fragment's own distance is what keeps the corners black.
  let reach = exp(-dist / (short * 0.34));
  let near = exp(-dist / (short * 0.30));
  let core = exp(-dist / (short * 0.028));

  var color = vec3f(0.0);
  // Beams: cool, and the loudest thing on screen.
  color = color + vec3f(0.52, 0.70, 1.00) * shafts * reach * 2.6;
  // Lit code: reads as syntax where the light reaches it.
  color = color + tint * ink * near * 2.2;
  // Ambient code so the wall exists in the dark.
  color = color + tint * ink * 0.030;
  // The source itself.
  color = color + vec3f(1.0, 0.94, 0.86) * core * 1.6;

  return vec4f(color * params.intro, 1.0);
}
