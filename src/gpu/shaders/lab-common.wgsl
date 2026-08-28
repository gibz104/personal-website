// Shared code-page sampling for the concept shaders.
//
// Bindings live in each entry shader (modules may not declare them), so these
// take the textures as parameters.

import { glyphCoverage } from "./glyph.wgsl";

export const CELL: vec2f = vec2f(12.0, 20.0);
const GRID: vec2i = vec2i(256, 128);

/// Glyph index and token class of the code cell under `p` (pixels).
export fn cellAt(grid: texture_2d<u32>, p: vec2f) -> vec2u {
  let c = vec2i(floor(p / CELL));
  // WGSL's % keeps the sign of the dividend, so a negative scroll would index
  // out of bounds without the double modulo.
  let wrapped = ((c % GRID) + GRID) % GRID;
  return textureLoad(grid, vec2u(wrapped), 0).xy;
}

/// Ink coverage of the glyph at `p` (pixels), 0..1.
export fn codeInk(
  atlas: texture_2d<f32>,
  samp: sampler,
  grid: texture_2d<u32>,
  p: vec2f,
) -> f32 {
  let data = cellAt(grid, p);
  return glyphCoverage(atlas, samp, data.x, fract(p / CELL));
}
