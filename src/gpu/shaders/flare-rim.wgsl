// Rim pass — ported from vgpu's nextjs-flare example.
//
// The mark is not an occluder here. It is the emitter: `sharp` dilates the mask
// outward so the glow starts just outside the letterform, and the result is
// divided by distance to the light, so whichever part of the mark is nearest
// the source burns brightest. That is what "the outside shines" means — the
// stroke itself is lit, and it is lit unevenly.

struct Params {
  light: vec2f,
  sceneTexel: vec2f,
  aspect: vec2f,
  spotReach: f32,
  spotStroke: f32,
}

@group(0) @binding(0) var linearSampler: sampler;
@group(0) @binding(1) var sceneTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> params: Params;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  var sharp = 0.0;
  let radius = max(0.5, params.spotStroke);
  for (var j = -3; j <= 3; j = j + 1) {
    for (var i = -3; i <= 3; i = i + 1) {
      let offset = vec2f(f32(i), f32(j)) * (radius / 3.0);
      if (length(offset) <= radius + 0.001) {
        sharp = max(
          sharp,
          textureSampleLevel(sceneTexture, linearSampler, uv + offset * params.sceneTexel, 0.0).r,
        );
      }
    }
  }
  let present = smoothstep(0.0015, 0.02, sharp);
  let distanceToLight = length((params.light - uv) * params.aspect);
  let falloff = mix(9.0, 0.4, params.spotReach);
  let lit = (sharp * sharp) * present / (1.0 + distanceToLight * distanceToLight * falloff);
  return vec4f(vec3f(lit), 1.0);
}
