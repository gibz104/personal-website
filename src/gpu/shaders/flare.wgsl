// The flare: light from behind the mark, and what the mark does to it.
//
// Same shape as vgpu's nextjs-flare — a source occluded by a silhouette, with
// the light marched toward it in screen space so the shafts bend around the
// letterforms rather than through them. Rendered at half resolution and blurred
// afterwards, which is what keeps thirty-two steps from looking like thirty-two
// steps.

struct Flare {
  resolution: vec2f,
  /// Source position in pixels, behind the mark.
  light: vec2f,
  /// Radius of the emissive core, in fractions of the short edge.
  core: f32,
  /// How fast the flare gives up with distance. Higher is tighter.
  reach: f32,
  shafts: f32,
  halo: f32,
  intensity: f32,
}

@group(0) @binding(0) var mark: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var<uniform> flare: Flare;

const STEPS: i32 = 32;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let frag = uv * flare.resolution;
  let short = min(flare.resolution.x, flare.resolution.y);

  // March toward the source. Occlusion accumulates as transmittance, so a ray
  // that crosses a stroke of the R arrives dark and one that slips through a
  // counter arrives lit.
  let toLight = flare.light - frag;
  let stepVec = toLight / f32(STEPS);
  var p = frag;
  var transmittance = 1.0;
  var shafts = 0.0;
  for (var i = 0; i < STEPS; i = i + 1) {
    p = p + stepVec;
    let occluded = textureSampleLevel(mark, samp, p / flare.resolution, 0.0).r;
    transmittance = transmittance * (1.0 - occluded * 0.97);
    shafts = shafts + exp(-length(p - flare.light) / (short * flare.core)) * transmittance;
  }
  shafts = shafts / f32(STEPS);

  let dist = length(frag - flare.light);
  // Every ray ends at the source, so each pixel picks up its glow unless the
  // fragment's own distance is accounted for. Without this the frame washes.
  let reach = 1.0 / (1.0 + pow(dist / (short * flare.reach), 2.0));

  // A soft unoccluded halo underneath, so the mark sits in a pool of light
  // rather than only throwing spokes.
  let hereOccluded = textureSampleLevel(mark, samp, uv, 0.0).r;
  let halo = reach * (1.0 - hereOccluded * 0.82) * flare.halo;

  let value = (shafts * flare.shafts * reach + halo) * flare.intensity;
  return vec4f(vec3f(value), 1.0);
}
