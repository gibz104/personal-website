// FOCUS — reward slowing down.
//
// Three layers that do different jobs. A tight lens resolves characters
// completely. A dim band across the cursor's row shows you where a line runs
// without letting you read it, so you know which way to move. Holding still
// ramps `dwell`, which widens the lens and pulls the whole row into focus —
// and a click pins that row so it stays readable while you look elsewhere.

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

  // --- the lens: small, total, and it grows as you settle ----------------
  let d = length(frag - params.pointer);
  let radius = mix(short * 0.085, short * 0.20, params.dwell);
  let lens = (1.0 - smoothstep(radius * 0.25, radius, d)) * params.pointerActive;

  // --- the context row: says "a line lives here", never enough to read ----
  let cursorRow = floor(params.pointer.y / CELL.y);
  let thisRow = floor(frag.y / CELL.y);
  let onRow = 1.0 - smoothstep(0.0, 1.4, abs(thisRow - cursorRow));
  let rowLevel = onRow * mix(0.34, 0.92, params.dwell) * params.pointerActive;

  // --- the pinned row: a click keeps one line legible while you move on ---
  let pinned = 1.0 - smoothstep(0.0, 1.4, abs(thisRow - params.pinnedRow));
  let pinnedLevel = pinned * step(0.0, params.pinnedRow) * 0.95;

  // A short-lived trail keeps the movement from feeling stroboscopic.
  let painted = textureSampleLevel(field, samp, uv, 0.0).r * 0.55;

  let reveal = max(max(lens, rowLevel), max(pinnedLevel, painted));
  var color = renderCell(atlas, samp, grid, frag, reveal, params.time, 1.0);

  // Rails on the focused row. Faded toward the edges on purpose: drawn at full
  // width they read as a UI divider rather than as part of the artwork.
  let railDist = abs(frag.y - (cursorRow + 0.5) * CELL.y);
  let alongRow = exp(-abs(frag.x - params.pointer.x) / (short * 0.45));
  let rail = exp(-pow((railDist - CELL.y * 0.62) / 1.8, 2.0))
    * params.pointerActive * alongRow;
  color = color + vec3f(0.24, 0.42, 0.66) * rail * (0.10 + params.dwell * 0.26);

  return vec4f(color * params.intro, 1.0);
}
