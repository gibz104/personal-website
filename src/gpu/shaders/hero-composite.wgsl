// Final assembly: plate, flare, rim, and the mark punched out in black.
//
// The mark is drawn last and drawn absolutely black. It is the only opaque
// thing in the frame, and everything else is what happens around it.

import { tonemapAces } from "@vgpu/wgsl-std/color";
import { hash2 } from "@vgpu/wgsl-std/hash";

struct Params {
  resolution: vec2f,
  light: vec2f,
  time: f32,
  bloom: f32,
  flareWeight: f32,
  rim: f32,
  vignette: f32,
  grain: f32,
  fade: f32,
}

@group(0) @binding(0) var plate: texture_2d<f32>;
@group(0) @binding(1) var bloom: texture_2d<f32>;
@group(0) @binding(2) var flare: texture_2d<f32>;
@group(0) @binding(3) var mark: texture_2d<f32>;
@group(0) @binding(4) var samp: sampler;
@group(0) @binding(5) var<uniform> params: Params;

/// Warm at the core, cooling outward — a light with a filament, not an LED.
fn flareColor(t: f32) -> vec3f {
  let warm = vec3f(1.00, 0.93, 0.82);
  let cool = vec3f(0.42, 0.62, 1.00);
  return mix(cool, warm, clamp(t * 1.6, 0.0, 1.0));
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let frag = uv * params.resolution;
  let texel = 1.0 / params.resolution;

  var color = textureSampleLevel(plate, samp, uv, 0.0).rgb;
  color = color + textureSampleLevel(bloom, samp, uv, 0.0).rgb * params.bloom;

  let flareValue = textureSampleLevel(flare, samp, uv, 0.0).r;
  color = color + flareColor(flareValue) * flareValue * params.flareWeight;

  // Rim: the contour of the mark that faces the source catches a thin line.
  // Built from the coverage gradient, so it hugs the letterform exactly.
  let e = 1.6;
  let gx = textureSampleLevel(mark, samp, uv + vec2f(texel.x * e, 0.0), 0.0).r
    - textureSampleLevel(mark, samp, uv - vec2f(texel.x * e, 0.0), 0.0).r;
  let gy = textureSampleLevel(mark, samp, uv + vec2f(0.0, texel.y * e), 0.0).r
    - textureSampleLevel(mark, samp, uv - vec2f(0.0, texel.y * e), 0.0).r;
  let edge = length(vec2f(gx, gy));
  let toLight = normalize(params.light - frag + vec2f(1e-4));
  // The gradient points into the mark, so negate to face outward.
  let facing = clamp(dot(normalize(vec2f(-gx, -gy) + vec2f(1e-5)), toLight), 0.0, 1.0);
  color = color + flareColor(0.9) * edge * pow(facing, 1.6) * params.rim;

  color = tonemapAces(color);

  let centered = uv - vec2f(0.5);
  let vig = 1.0 - params.vignette * smoothstep(0.15, 0.85, dot(centered, centered) * 2.0);
  color = color * vig;

  let noise = hash2(uv * params.resolution + vec2f(params.time * 91.7, params.time * 47.3));
  color = color + (noise.x - 0.5) * params.grain;

  color = max(color, vec3f(0.004, 0.005, 0.009));

  // The mark, last and absolutely black.
  let coverage = smoothstep(0.35, 0.65, textureSampleLevel(mark, samp, uv, 0.0).r);
  color = mix(color, vec3f(0.0), coverage);

  return vec4f(color * params.fade, 1.0);
}
