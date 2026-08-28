// CASCADE — rain that reads.
//
// Narrow columns of decode fall down the page. Each is one character wide, so a
// drop hands you a word and never a line: it keeps the Matrix rhythm and the
// sense that the page is alive, without answering the question the cursor asks.
// Drops brighten as they pass near the pointer, and a click seeds a burst of
// them where you struck.

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

  // --- the falling columns ------------------------------------------------
  let colId = floor(frag.x / CELL.x);
  let colSeed = hash2(vec2f(colId, 3.71));

  // Only some columns ever carry a drop, or the whole page becomes a curtain.
  let carries = step(0.84, colSeed.x);
  let speed = 0.22 + colSeed.y * 0.40;
  let span = params.resolution.y * 1.6;
  let head = fract(params.time * speed + colSeed.x * 17.0) * span - params.resolution.y * 0.30;

  // Distance behind the head, which is where the tail trails.
  let behind = head - frag.y;
  let tail = exp(-max(behind, 0.0) / (short * 0.20)) * step(0.0, behind);
  var drop = carries * tail;

  // A click seeds extra drops around where it landed, for a few seconds.
  let burstCol = abs(frag.x - params.click.x);
  let burst = exp(-burstCol / (short * 0.10)) * exp(-params.clickAge * 0.7);
  let burstHead = fract(params.time * 0.7 + colSeed.y * 5.0) * span - params.resolution.y * 0.30;
  let burstBehind = burstHead - frag.y;
  drop = max(drop, burst * exp(-max(burstBehind, 0.0) / (short * 0.12)) * step(0.0, burstBehind));

  // --- the pointer --------------------------------------------------------
  let painted = textureSampleLevel(field, samp, uv, 0.0).r;

  // Drops passing near the pointer decode harder — attention pulls them into
  // focus, which rewards chasing one across the page.
  let toPointer = length(frag - params.pointer);
  let attention = (1.0 - smoothstep(0.0, short * 0.30, toPointer)) * params.pointerActive;
  // A drop has to actually resolve characters on its own, or it reads as a
  // light streak rather than as code falling past.
  drop = drop * (0.80 + attention * 0.70);

  let reveal = clamp(max(painted, drop), 0.0, 1.0);
  var color = renderCell(atlas, samp, grid, frag, reveal, params.time, 1.0);

  // The head of each drop is the brightest thing in its column.
  let headGlow = carries * exp(-abs(behind) / (CELL.y * 1.6));
  color = color + vec3f(0.62, 0.86, 1.0) * headGlow * 0.16;

  return vec4f(color * params.intro, 1.0);
}
