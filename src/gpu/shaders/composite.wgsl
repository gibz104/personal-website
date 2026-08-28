// Final grade: scene + two bloom octaves, tonemapped, vignetted, and grained.
// Everything that makes it look like a photograph rather than a render happens
// in this pass.

import { tonemapAces } from "@vgpu/wgsl-std/color";
import { hash2 } from "@vgpu/wgsl-std/hash";

struct Params {
  resolution: vec2f,
  time: f32,
  exposure: f32,
  bloomNear: f32,
  bloomFar: f32,
  vignette: f32,
  grain: f32,
  aberration: f32,
  fade: f32,
}

@group(0) @binding(0) var scene: texture_2d<f32>;
@group(0) @binding(1) var bloomNear: texture_2d<f32>;
@group(0) @binding(2) var bloomFar: texture_2d<f32>;
@group(0) @binding(3) var samp: sampler;
@group(0) @binding(4) var<uniform> params: Params;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let centered = uv - vec2f(0.5);
  let r2 = dot(centered, centered);

  // Chromatic aberration, strictly at the edges. Sampling the scene three
  // times with a radial offset is enough; the bloom does not need it.
  let shift = centered * r2 * params.aberration;
  var colour = vec3f(
    textureSampleLevel(scene, samp, uv + shift, 0.0).r,
    textureSampleLevel(scene, samp, uv, 0.0).g,
    textureSampleLevel(scene, samp, uv - shift, 0.0).b,
  );

  colour = colour
    + textureSampleLevel(bloomNear, samp, uv, 0.0).rgb * params.bloomNear
    + textureSampleLevel(bloomFar, samp, uv, 0.0).rgb * params.bloomFar;

  colour = colour * params.exposure;
  colour = tonemapAces(colour);

  // Vignette, generous but soft — it is doing the framing work.
  let vig = 1.0 - params.vignette * smoothstep(0.15, 0.85, r2 * 2.0);
  colour = colour * vig;

  // Grain last, so it sits on top of the grade like film rather than being
  // amplified by it. Animated, or it reads as sensor dirt.
  let noise = hash2(uv * params.resolution + vec2f(params.time * 91.7, params.time * 47.3));
  colour = colour + (noise.x - 0.5) * params.grain;

  // A near-black floor keeps the darks from being a dead flat #000.
  colour = max(colour, vec3f(0.004, 0.005, 0.009));

  return vec4f(colour * params.fade, 1.0);
}
