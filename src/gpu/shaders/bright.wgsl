// Bright-pass: isolates what should bloom, with a soft knee so the threshold
// never shows up as a hard edge in the glow.

import { luminanceThreshold } from "@vgpu/wgsl-std/color";

struct Params { threshold: f32, knee: f32, amount: f32 }

@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var<uniform> params: Params;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let colour = textureSampleLevel(src, samp, uv, 0.0).rgb;
  let bright = luminanceThreshold(colour, params.threshold, params.knee);
  // Clamping before the blur matters: a single 200-nit particle spread over a
  // 160px-wide buffer is what turns bloom into visible blocks.
  return vec4f(min(bright * params.amount, vec3f(6.0)), 1.0);
}
