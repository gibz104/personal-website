// The background plate: the character board, still.
//
// Deliberately unlit. All the light in this scene comes from the mark, so the
// plate stays flat and dark — it is what the flare falls on, not a second thing
// competing for attention.

import { CELL, placementAt } from "./lab-common.wgsl";
import { flapState, rain, sampleBoard } from "./decode-core.wgsl";

struct Params {
  resolution: vec2f,
  time: f32,
  /// Populated rows in the corpus texture.
  corpusCount: f32,
  /// Shifts which rows of the board this session is looking at.
  rowOffset: f32,
  intro: f32,
}

@group(0) @binding(0) var atlas: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var corpus: texture_2d<u32>;
@group(0) @binding(3) var<uniform> params: Params;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let frag = uv * params.resolution;
  // The field does not scroll. Characters flicker where they are; the lines
  // arriving among them are placed procedurally and never repeat.
  let cellId = floor(frag / CELL) + vec2f(0.0, params.rowOffset);
  let cols = params.resolution.x / CELL.x;

  let place = placementAt(corpus, cellId, params.time, params.corpusCount, cols);
  let flap = flapState(place, cellId);
  let sample = sampleBoard(atlas, samp, place, flap, frag, params.time);

  // Landed characters brighten as well as change colour, so a settled line
  // lifts out of the field rather than only tinting.
  let level = mix(0.40, 1.95, sample.decoded);

  // Rain brightens the cipher it falls through, and leaves landed code alone
  // so it cannot wash out a line that is being read.
  let fall = rain(frag, params.resolution, params.time) * (1.0 - sample.decoded);
  var color = sample.tint * sample.ink * level;
  color = color + mix(vec3f(0.55, 0.78, 0.92), vec3f(0.85, 0.95, 1.0), fall)
    * sample.ink * fall * 1.15;

  return vec4f(color * params.intro, 1.0);
}
