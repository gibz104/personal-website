// Multiplies whatever is already in the accumulation target by `decay`.
//
// Drawn with blend { src: zero, dst: src }, so the result is dst * srcColor —
// a decay-only pass with no read-back. This persistence is what turns moving
// points into continuous filaments instead of a field of speckles.

struct Params { decay: f32 }

@group(0) @binding(0) var<uniform> params: Params;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  return vec4f(vec3f(params.decay), params.decay);
}
