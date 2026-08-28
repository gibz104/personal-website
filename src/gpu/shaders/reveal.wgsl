// Persistent reveal field.
//
// Ping-ponged each frame: what the pointer touched stays lit and fades on its
// own, so exploring accumulates instead of resetting the moment you move away.

import { distToSegment } from "./decode-core.wgsl";

struct Reveal {
  resolution: vec2f,
  pointer: vec2f,
  previous: vec2f,
  click: vec2f,
  radius: f32,
  strength: f32,
  decay: f32,
  clickAge: f32,
  clickRadius: f32,
  pointerActive: f32,
}

@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var<uniform> reveal: Reveal;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let frag = uv * reveal.resolution;
  let previous = textureSampleLevel(src, samp, uv, 0.0).r * reveal.decay;

  // Stamp along the path travelled this frame, not just the endpoint.
  let d = distToSegment(frag, reveal.previous, reveal.pointer);
  let stamp = (1.0 - smoothstep(reveal.radius * 0.15, reveal.radius, d))
    * reveal.strength * reveal.pointerActive;

  // The click leaves a deeper mark than a pass of the pointer, and it holds.
  let clickDist = length(frag - reveal.click);
  let clickStamp = (1.0 - smoothstep(0.0, reveal.clickRadius, clickDist))
    * exp(-reveal.clickAge * 0.5);

  let next = max(previous, max(stamp, clickStamp));
  return vec4f(vec3f(clamp(next, 0.0, 1.0)), 1.0);
}
