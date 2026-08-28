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
  /// Pixels the code moved this frame. The buffer has to travel with the
  /// content, or a scrolling page drags its own history across itself.
  scrollDelta: vec2f,
  radius: f32,
  strength: f32,
  decay: f32,
  clickAge: f32,
  clickRadius: f32,
  pointerActive: f32,
  /// Neighbour bleed per frame. Zero for a plain trail; above zero the field
  /// spreads outward on its own, which is what lets charge propagate.
  spread: f32,
}

@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var<uniform> reveal: Reveal;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let frag = uv * reveal.resolution;
  let texel = 1.0 / reveal.resolution;
  let shifted = uv + reveal.scrollDelta * texel;

  var previous = textureSampleLevel(src, samp, shifted, 0.0).r;

  // Four-tap bleed: each cell hands a little of its charge to its neighbours,
  // so a spark walks outward instead of merely fading in place.
  if (reveal.spread > 0.0) {
    let step = texel * 1.5;
    var neighbours = textureSampleLevel(src, samp, shifted + vec2f(step.x, 0.0), 0.0).r;
    neighbours = neighbours + textureSampleLevel(src, samp, shifted - vec2f(step.x, 0.0), 0.0).r;
    neighbours = neighbours + textureSampleLevel(src, samp, shifted + vec2f(0.0, step.y), 0.0).r;
    neighbours = neighbours + textureSampleLevel(src, samp, shifted - vec2f(0.0, step.y), 0.0).r;
    previous = mix(previous, neighbours * 0.25, reveal.spread);
  }

  previous = previous * reveal.decay;

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
