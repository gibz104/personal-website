// Separable Gaussian. Run once horizontally, once vertically; widen `radius`
// on later octaves to build a large, soft bloom out of cheap passes.

struct Params { direction: vec2f, texel: vec2f, radius: f32 }

@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var<uniform> params: Params;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  // 9-tap kernel using linear-sampling pairs, so it costs 5 fetches.
  let offsets = array<f32, 5>(0.0, 1.4117647, 3.2941176, 5.1764706, 7.0588235);
  let weights = array<f32, 5>(0.1963806, 0.2969070, 0.0944703, 0.0103813, 0.0005544);

  let step = params.direction * params.texel * params.radius;
  var sum = textureSampleLevel(src, samp, uv, 0.0).rgb * weights[0];
  for (var i = 1u; i < 5u; i = i + 1u) {
    let o = step * offsets[i];
    sum = sum + textureSampleLevel(src, samp, uv + o, 0.0).rgb * weights[i];
    sum = sum + textureSampleLevel(src, samp, uv - o, 0.0).rgb * weights[i];
  }
  return vec4f(sum, 1.0);
}
