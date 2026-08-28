// Draws each project as a body: a hot core, a thin containment ring, and a
// wide soft halo. One instance per attractor.

import { tau } from "@vgpu/wgsl-std/constants";

struct Attractor {
  posMass: vec4f,
  color: vec4f,
}

struct View {
  center: vec2f,
  scale: vec2f,
  viewport: vec2f,
  glow: f32,
  time: f32,
  hoverIndex: f32,
  hoverAmount: f32,
  focusIndex: f32,
  focusAmount: f32,
}

@group(0) @binding(0) var<uniform> field: array<Attractor, 24>;
@group(0) @binding(1) var<uniform> view: View;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) offset: vec2f,
  @location(1) tint: vec3f,
  @location(2) weight: f32,
  @location(3) emphasis: f32,
}

@vertex
fn vs_main(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instance: u32,
) -> VertexOut {
  var corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0),
  );
  let corner = corners[vertexIndex];
  let a = field[instance];

  let hovered = select(0.0, 1.0, f32(instance) == view.hoverIndex) * view.hoverAmount;
  let focused = select(0.0, 1.0, f32(instance) == view.focusIndex) * view.focusAmount;
  let emphasis = max(hovered, focused);

  // The halo has to be much wider than the core or the glow gets clipped.
  let extent = a.posMass.w * (7.5 + emphasis * 3.0);
  let world = (a.posMass.xy - view.center) * view.scale;
  let clip = world + vec2f(
    corner.x * extent * view.scale.x,
    corner.y * extent * view.scale.y,
  );

  var out: VertexOut;
  out.position = vec4f(clip, 0.0, 1.0);
  out.offset = corner;
  out.tint = a.color.rgb;
  out.weight = a.posMass.z;
  out.emphasis = emphasis;
  return out;
}

@fragment
fn fs_main(input: VertexOut) -> @location(0) vec4f {
  let d = length(input.offset);
  if (d > 1.0) { discard; }

  // Core: a small, very bright disc that blooms into a star.
  let core = pow(clamp(1.0 - d * 7.5, 0.0, 1.0), 2.6);

  // Ring: a thin annulus that reads as structure rather than glow, and slowly
  // breathes so a static page never feels frozen.
  let breathe = 0.5 + 0.5 * sin(view.time * 0.8 + input.weight * 3.1);
  let ringRadius = 0.30 + input.emphasis * 0.06;
  let ring = pow(clamp(1.0 - abs(d - ringRadius) * 26.0, 0.0, 1.0), 1.9)
    * (0.22 + breathe * 0.14 + input.emphasis * 0.55);

  // Halo: the wide falloff that sells it as a light source.
  let halo = pow(clamp(1.0 - d, 0.0, 1.0), 3.4) * (0.16 + input.emphasis * 0.30);

  let energy = (core * 2.6 + ring + halo) * view.glow * (0.55 + input.weight * 0.55);
  let colour = mix(input.tint, vec3f(1.0), clamp(core * 1.4, 0.0, 0.85));

  return vec4f(colour * energy, clamp(energy, 0.0, 1.0));
}
