// Draws the particle field as additively-blended soft points.
//
// One instance per particle, six vertices per instance. The vertex stage reads
// simulation state straight out of the storage buffer the compute pass wrote,
// so nothing round-trips through the CPU.

struct Particle {
  pos: vec2f,
  vel: vec2f,
  color: vec3f,
  seed: f32,
  life: f32,
  bond: f32,
  energy: f32,
  kind: f32,
}

struct View {
  center: vec2f,
  scale: vec2f,
  viewport: vec2f,
  exposure: f32,
  pointSize: f32,
  time: f32,
  trail: f32,
}

@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<uniform> view: View;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) offset: vec2f,
  @location(1) tint: vec3f,
  @location(2) intensity: f32,
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
  let p = particles[instance];

  // Fade in on birth and out on death so respawns never pop.
  let age = clamp(p.life * 1.6, 0.0, 1.0);
  // Ambient particles are deliberately an order of magnitude fainter. They are
  // atmosphere; the emitted ones carry the structure.
  let weight = mix(0.24, 1.0, p.kind);
  let intensity = age * (0.30 + p.energy * 0.85) * weight;

  // Stretch along velocity: a still particle is a dot, a fast one is a streak.
  // This is what turns a cloud of points into visible filaments.
  let speed = length(p.vel);
  let dir = select(vec2f(1.0, 0.0), p.vel / max(speed, 1e-5), speed > 1e-5);
  let along = min(speed * view.trail, 5.5);
  let basis = vec2f(1.0 + along, 1.0);

  let local = vec2f(corner.x * basis.x, corner.y * basis.y) * view.pointSize;
  let rotated = vec2f(
    local.x * dir.x - local.y * dir.y,
    local.x * dir.y + local.y * dir.x,
  );

  let world = (p.pos - view.center) * view.scale;
  // pointSize arrives in clip units already scaled for aspect.
  let clip = world + vec2f(rotated.x, rotated.y * view.viewport.x / view.viewport.y);

  var out: VertexOut;
  out.position = vec4f(clip, 0.0, 1.0);
  out.offset = corner;
  out.tint = p.color;
  out.intensity = intensity * view.exposure;
  return out;
}

@fragment
fn fs_main(input: VertexOut) -> @location(0) vec4f {
  // Soft radial falloff, squared for a tight core and a wide halo.
  let d = length(input.offset);
  if (d > 1.0) { discard; }
  let falloff = 1.0 - d;
  let alpha = falloff * falloff * falloff;

  // Only the genuinely hot cores bleach toward white. Bleaching early costs
  // all the colour, because additive accumulation drives everything to white
  // on its own once a few hundred particles overlap.
  let heat = clamp(input.intensity * 0.22, 0.0, 1.0);
  let colour = mix(input.tint, vec3f(1.0), heat * 0.30);

  return vec4f(colour * alpha * input.intensity, alpha * 0.5);
}
