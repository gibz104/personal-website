// Shared glyph sampling. Modules cannot declare bindings, so the textures are
// passed in and every concept shader owns its own @group/@binding block.

const GLYPH_FIRST: u32 = 32u;
const GLYPH_COLS: f32 = 16.0;
const GLYPH_ROWS: f32 = 6.0;

/// Coverage of glyph `index` at `uv` within its cell (uv in 0..1).
export fn glyphCoverage(
  atlas: texture_2d<f32>,
  samp: sampler,
  index: u32,
  uv: vec2f,
) -> f32 {
  // Outside the cell there is no glyph; clamping instead would smear the
  // neighbouring character across the gap.
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { return 0.0; }
  let col = f32(index % 16u);
  let row = f32(index / 16u);
  let cell = vec2f(1.0 / GLYPH_COLS, 1.0 / GLYPH_ROWS);
  // Inset by half a texel so linear filtering never bleeds in from the
  // neighbouring cell.
  let inset = cell * 0.004;
  let base = vec2f(col, row) * cell;
  return textureSampleLevel(atlas, samp, base + inset + uv * (cell - inset * 2.0), 0.0).r;
}

/// Colour for a token class. Kept in WGSL so every concept agrees.
export fn tokenColor(token: u32) -> vec3f {
  switch token {
    case 1u: { return vec3f(1.00, 0.46, 0.18); }  // Rust
    case 2u: { return vec3f(0.32, 0.72, 1.00); }  // TypeScript
    case 3u: { return vec3f(0.42, 0.92, 0.74); }  // Python
    case 4u: { return vec3f(0.78, 0.48, 1.00); }  // C++
    case 5u: { return vec3f(0.94, 0.96, 1.00); }  // keyword
    case 6u: { return vec3f(1.00, 0.80, 0.42); }  // string
    case 7u: { return vec3f(0.55, 0.95, 0.95); }  // literal
    default: { return vec3f(0.42, 0.48, 0.60); }  // punctuation
  }
}
