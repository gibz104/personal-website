// Advects the particle field for one step.
//
// Particles are emitted by attractors (projects), carried by a divergence-free
// curl-noise flow, and recaptured by other attractors. That round trip is what
// draws the luminous filaments *between* projects rather than around them.

import { simplex3d } from "@vgpu/wgsl-std/noise/simplex";
import { hash1, hash2 } from "@vgpu/wgsl-std/hash";
import { tau } from "@vgpu/wgsl-std/constants";

// 48 bytes, 16-byte aligned. `color` is resolved here, once per particle per
// step, so the vertex stage never has to search the attractor list.
struct Particle {
  pos: vec2f,
  vel: vec2f,
  color: vec3f,
  seed: f32,
  life: f32,
  bond: f32,
  energy: f32,
  // 1 = thrown off an attractor, 0 = ambient. Emitted particles draw the
  // bright filaments; ambient ones are a faint nebula and must stay dim, or
  // their trails comb the whole frame into haze.
  kind: f32,
}

struct Attractor {
  // xy = position, z = mass, w = core radius
  posMass: vec4f,
  // rgb = colour, a = 1 when featured
  color: vec4f,
}

struct Sim {
  pointer: vec2f,
  bounds: vec2f,
  dt: f32,
  time: f32,
  count: u32,
  attractorCount: u32,
  pointerForce: f32,
  flow: f32,
  gravity: f32,
  coupling: f32,
  bonding: f32,
  swirl: f32,
  focusIndex: f32,
  focusAmount: f32,
}

@group(0) @binding(0) var<storage, read> src: array<Particle>;
@group(0) @binding(1) var<storage, read_write> dst: array<Particle>;
@group(0) @binding(2) var<uniform> sim: Sim;
@group(0) @binding(3) var<uniform> field: array<Attractor, 24>;

/// Divergence-free 2D flow: the perpendicular gradient of a scalar potential.
/// Divergence-free is the whole point — it means the field never compresses
/// particles into blobs, so they stay in filaments.
fn curl(p: vec2f, t: f32) -> vec2f {
  let e = 0.11;
  let a = simplex3d(vec3f(p.x, p.y + e, t));
  let b = simplex3d(vec3f(p.x, p.y - e, t));
  let c = simplex3d(vec3f(p.x + e, p.y, t));
  let d = simplex3d(vec3f(p.x - e, p.y, t));
  // Second octave adds detail without a second fbm call per sample.
  let a2 = simplex3d(vec3f(p.x * 2.7, (p.y + e) * 2.7, t * 1.6)) * 0.42;
  let b2 = simplex3d(vec3f(p.x * 2.7, (p.y - e) * 2.7, t * 1.6)) * 0.42;
  let c2 = simplex3d(vec3f((p.x + e) * 2.7, p.y * 2.7, t * 1.6)) * 0.42;
  let d2 = simplex3d(vec3f((p.x - e) * 2.7, p.y * 2.7, t * 1.6)) * 0.42;
  // Normalised so `flow` is an intuitive 0..1 dial: the raw finite difference
  // spans roughly +/-13 at this epsilon, which would swamp gravity entirely.
  return vec2f((a + a2) - (b + b2), (d + d2) - (c + c2)) / (2.0 * e) * 0.08;
}

/// Picks an emitter, weighted by mass, so heavier projects throw more light.
fn pickAttractor(u: f32) -> u32 {
  var total = 0.0;
  for (var i = 0u; i < sim.attractorCount; i = i + 1u) {
    total = total + field[i].posMass.z;
  }
  if (total <= 0.0) { return 0u; }
  var cursor = u * total;
  for (var i = 0u; i < sim.attractorCount; i = i + 1u) {
    cursor = cursor - field[i].posMass.z;
    if (cursor <= 0.0) { return i; }
  }
  return sim.attractorCount - 1u;
}

/// Emits a particle, either from an attractor's surface or into open field.
///
/// The mix matters: attractor-borne particles draw the bright filaments
/// between projects, while ambient ones fill the space around them with a
/// faint drifting haze. Emitters alone leave most of the frame empty.
fn spawn(index: u32, salt: f32) -> Particle {
  let s = f32(index) * 0.6180339887 + salt;
  let r = hash2(vec2f(s, salt * 1.37));
  let which = pickAttractor(fract(r.x));
  let a = field[which];

  let angle = fract(r.y) * tau;
  let dir = vec2f(cos(angle), sin(angle));
  // Start just outside the core so the emitter reads as a ring, not a dot.
  let emitted = a.posMass.xy + dir * (a.posMass.w * (1.35 + hash1(s * 3.1) * 0.9));

  let ambient = hash1(s * 5.9) < 0.42;
  let drift = hash2(vec2f(s * 2.3, s * 4.1)) * 2.0 - vec2f(1.0);
  let loose = drift * sim.bounds;
  let start = select(emitted, loose, ambient);

  var p: Particle;
  p.pos = start;
  // Barely any launch impulse: the flow field should own the trajectory almost
  // immediately, otherwise every emitter throws a visible radial starburst.
  p.vel = dir * (0.012 + hash1(s * 7.7) * 0.022);
  p.color = a.color.rgb;
  p.seed = fract(s * 0.7548776662);
  // Long lives matter: a particle has to survive long enough to be carried
  // across the field and captured somewhere else, or there are no filaments
  // between projects, only halos around them.
  p.life = 7.0 + hash1(s * 11.3) * 11.0;
  p.bond = f32(which);
  p.energy = 0.0;
  p.kind = select(1.0, 0.0, ambient);
  return p;
}

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= sim.count) { return; }

  var p = src[i];
  let dt = sim.dt;

  // A never-initialised particle has zero life and spawns on its first step.
  if (p.life <= 0.0) {
    dst[i] = spawn(i, sim.time * 0.37 + f32(i) * 0.0001);
    return;
  }

  // The curl field is a VELOCITY, not a force. Putting particles onto its
  // streamlines is the whole reason the field reads as filaments rather than
  // as drifting speckle — a divergence-free velocity field has coherent
  // streamlines by construction, and particles that track it inherit them.
  // Every particle reads the field at a slightly different scale. Without this
  // they all converge onto the same handful of streamlines and the field
  // collapses into a few clean lines; with it, each line opens into a ribbon.
  let fieldScale = 1.12 + p.seed * 0.86;
  var desired = curl(p.pos * fieldScale, sim.time * 0.085) * sim.flow;

  // Gravity toward every project, plus a tangential term so particles braid
  // around a body instead of falling straight into it.
  var captured = false;
  var nearest = 0u;
  var nearestDist = 1e9;
  for (var k = 0u; k < sim.attractorCount; k = k + 1u) {
    let a = field[k];
    let d = a.posMass.xy - p.pos;
    let dist = max(length(d), 1e-4);
    let dir = d / dist;

    // Softened 1/r rather than 1/r^2: a hard inverse-square makes every
    // approach terminal, and nothing ever escapes to form a filament.
    var pull = a.posMass.z / (dist + 0.09);
    if (sim.focusAmount > 0.0) {
      let isFocus = select(0.0, 1.0, f32(k) == sim.focusIndex);
      pull = pull * mix(1.0, mix(0.12, 4.0, isFocus), sim.focusAmount);
    }
    desired = desired + dir * pull * sim.gravity;

    // Swirl must be LOCAL. Summed over sixteen bodies, a slow 1/r falloff
    // becomes one global vortex that sweeps the whole field into a single
    // rotation; the exponential keeps each body braiding only its own traffic.
    let tangent = vec2f(-dir.y, dir.x);
    desired = desired + tangent * a.posMass.z * exp(-dist * 5.0) * sim.swirl;

    if (dist < nearestDist) { nearestDist = dist; nearest = k; }
    if (dist < a.posMass.w) { captured = true; }
  }

  // A filament leaving Rethix and falling into SpoolmanSync should read as a
  // gradient between the two: source colour, tinted by whatever has it now.
  let origin = field[u32(p.bond)].color.rgb;
  let claim = 1.0 - smoothstep(0.02, 0.45, nearestDist);
  p.color = mix(p.color, mix(origin, field[nearest].color.rgb, claim * 0.9), clamp(dt * 2.5, 0.0, 1.0));

  // Pointer: a soft repulsor that tears the filaments open as it passes.
  let toPointer = p.pos - sim.pointer;
  let pointerDist = length(toPointer);
  if (pointerDist < 0.42) {
    let falloff = 1.0 - smoothstep(0.05, 0.42, pointerDist);
    desired = desired
      + (toPointer / max(pointerDist, 1e-4)) * sim.pointerForce * falloff * falloff * 0.85;
  }

  // Relax toward the field velocity. `coupling` is how tightly a particle is
  // held to the streamline: high is crisp filaments, low is loose smoke.
  // Coupling varies per particle too, so some hug the streamline and others
  // lag behind it — the difference between a wire and a rope.
  let coupling = sim.coupling * (0.55 + p.seed * 0.95);
  p.vel = mix(p.vel, desired, 1.0 - exp(-coupling * dt));

  let speed = length(p.vel);
  if (speed > 2.6) { p.vel = p.vel * (2.6 / speed); }

  p.pos = p.pos + p.vel * dt;
  p.life = p.life - dt;

  // Energy tracks speed, so the field glows brightest where flow is strongest.
  let wanted = clamp(speed * 2.6, 0.0, 1.7);
  p.energy = mix(p.energy, wanted, clamp(dt * 5.0, 0.0, 1.0));

  let outOfBounds =
    abs(p.pos.x) > sim.bounds.x * 1.35 || abs(p.pos.y) > sim.bounds.y * 1.35;

  if (captured || outOfBounds || p.life <= 0.0) {
    dst[i] = spawn(i, sim.time * 0.37 + f32(i) * 0.0001 + p.seed);
    return;
  }

  dst[i] = p;
}
