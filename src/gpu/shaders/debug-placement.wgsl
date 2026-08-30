// Test-only: renders the board's line layout so it can be read back and checked.
//
// Not part of the page. `scripts/verify-lines.mts` uses it to assert that every
// placed line appears whole — a contiguous run from its first character to its
// last — because a line broken in the middle is invisible to a glance at the
// artwork but obvious here.

import { placementAt } from "./board.wgsl";

struct Params {
  resolution: vec2f,
  cell: vec2f,
  time: f32,
  usableCount: f32,
  rowOffset: f32,
}

@group(0) @binding(0) var corpus: texture_2d<u32>;
@group(0) @binding(1) var<uniform> params: Params;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let frag = uv * params.resolution;
  let cellId = floor(frag / params.cell) + vec2f(0.0, params.rowOffset);
  let cols = params.resolution.x / params.cell.x;
  let place = placementAt(corpus, cellId, params.time, params.usableCount, cols);

  // R: which glyph. G: how far along its line, quantised. B: covered at all.
  return vec4f(
    f32(place.glyph) / 255.0,
    place.along,
    place.present,
    1.0,
  );
}
