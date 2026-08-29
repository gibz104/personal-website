// The mark's contour.
//
// A dilation minus the mask gives a stroke sitting just outside the letter,
// with a width that is actually controllable — unlike a coverage gradient,
// whose thickness is whatever the rasteriser's antialiasing ramp happened to be
// and which cannot be widened without going soft.

/// Ring dilation. Twelve taps is plenty for a stroke this thin, and far cheaper
/// than the square neighbourhood a box dilation would need.
export fn dilate(
  mark: texture_2d<f32>,
  samp: sampler,
  uv: vec2f,
  radius: vec2f,
) -> f32 {
  var m = 0.0;
  for (var i = 0; i < 12; i = i + 1) {
    let a = f32(i) * 0.5235988;
    m = max(m, textureSampleLevel(mark, samp, uv + vec2f(cos(a), sin(a)) * radius, 0.0).r);
  }
  return m;
}

/// The stroke itself, 0..1.
export fn contour(
  mark: texture_2d<f32>,
  samp: sampler,
  uv: vec2f,
  texel: vec2f,
  width: f32,
) -> f32 {
  let here = textureSampleLevel(mark, samp, uv, 0.0).r;
  let ring = clamp(dilate(mark, samp, uv, texel * width) - here, 0.0, 1.0);
  return smoothstep(0.12, 0.72, ring);
}
