// Separable blur — ported from vgpu's nextjs-flare example.
//
// Eight linear-sampled tap pairs plus a centre weight. The offsets are not
// integers: each tap sits between two texels so one bilinear fetch carries two
// samples, which is how a 33-wide kernel costs seventeen reads.

const MAX_TAPS: u32 = 8u;

struct Params {
  direction: vec2f,
  texelSize: vec2f,
  taps: array<vec4f, 8>,
  centerWeight: f32,
  tapCount: u32,
}

@group(0) @binding(0) var linearSampler: sampler;
@group(0) @binding(1) var sourceTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> params: Params;

fn sampleClamped(uv: vec2f) -> vec3f {
  let halfTexel = params.texelSize * 0.5;
  return textureSampleLevel(
    sourceTexture, linearSampler,
    clamp(uv, halfTexel, vec2f(1.0) - halfTexel), 0.0,
  ).rgb;
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  var color = sampleClamped(uv) * params.centerWeight;
  for (var index = 0u; index < MAX_TAPS; index = index + 1u) {
    if (index >= params.tapCount) { break; }
    let tap = params.taps[index];
    color = color + sampleClamped(uv + params.direction * tap.x) * tap.y;
    color = color + sampleClamped(uv - params.direction * tap.x) * tap.y;
  }
  return vec4f(color, 1.0);
}
