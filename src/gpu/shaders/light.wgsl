// The page's lighting.
//
// Modelled on how vgpu's own `nextjs-flare` and `triangle-led-front` examples
// light their subjects: a soft inverse-square radiance falloff, not a marched
// beam. There is nothing to watch travelling across the screen — the page is
// simply lit, and the light gives the characters relief.
//
// The pointer *nudges* the source; it never carries it. The light has a home
// and drifts a fraction of the viewport around it, which reads as the page
// turning slightly toward you rather than as a torch being waved about.

import { codeInk } from "./lab-common.wgsl";

/// Where the key light sits. `home` is in 0..1 of the viewport.
export fn keyLight(
  home: vec2f,
  pointer: vec2f,
  pointerActive: f32,
  resolution: vec2f,
  time: f32,
  travel: f32,
) -> vec2f {
  // A slow breath so the page is never completely static.
  let breathe = vec2f(sin(time * 0.11), cos(time * 0.083)) * 0.035;
  let anchor = (home + breathe) * resolution;
  let offset = (pointer - resolution * 0.5) * travel;
  return anchor + offset * pointerActive;
}

/// Broad inverse-square radiance. `softness` above 1 widens the pool.
export fn radiance(frag: vec2f, light: vec2f, resolution: vec2f, softness: f32) -> f32 {
  let d = length((frag - light) / resolution.y);
  return 1.0 / (1.0 + d * d * softness);
}

/// Lambert term from a pseudo-normal built out of the glyph coverage gradient.
///
/// This is what turns flat text into a lit surface: the derivative of coverage
/// stands in for a surface normal, so the strokes of each character catch the
/// key light on the side facing it and fall away on the other.
export fn relief(
  atlas: texture_2d<f32>,
  samp: sampler,
  grid: texture_2d<u32>,
  p: vec2f,
  frag: vec2f,
  light: vec2f,
  resolution: vec2f,
  depth: f32,
) -> f32 {
  let e = 1.15;
  let dx = codeInk(atlas, samp, grid, p + vec2f(e, 0.0))
    - codeInk(atlas, samp, grid, p - vec2f(e, 0.0));
  let dy = codeInk(atlas, samp, grid, p + vec2f(0.0, e))
    - codeInk(atlas, samp, grid, p - vec2f(0.0, e));

  let normal = normalize(vec3f(-dx, -dy, depth));
  // The light sits in front of the page, so its z is a fixed standoff.
  let toLight = normalize(vec3f((light - frag) / resolution.y, 0.85));
  return clamp(dot(normal, toLight), 0.0, 1.0);
}
