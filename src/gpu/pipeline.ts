import type { Gpu, Surface, Target } from "vgpu";
import { MAX_ATTRACTORS, packAttractors } from "./layout";
import { viewCenter } from "./scenes";
import type { Attractor, SceneParams, ShaderBundle } from "./types";

/**
 * The slice of the vgpu module the pipeline needs. `vgpu` and `vgpu/node`
 * both satisfy it, which is what lets the headless preview render byte-for-byte
 * the same passes the browser does.
 */
export type FieldApi = Pick<
  typeof import("vgpu"),
  | "compute"
  | "draw"
  | "effect"
  | "frame"
  | "pingPongStorage"
  | "sampler"
  | "target"
>;

export type Quality = "high" | "medium" | "low";

const PARTICLE_BYTES = 48;

const QUALITY: Record<Quality, { particles: number; bloomDivisor: number }> = {
  high: { particles: 180_000, bloomDivisor: 2 },
  medium: { particles: 90_000, bloomDivisor: 3 },
  low: { particles: 36_000, bloomDivisor: 4 },
};

export type FrameParams = {
  time: number;
  dt: number;
  /** Pointer in world space. */
  pointer: readonly [number, number];
  /** 0 when the pointer is away; ramps up while it is over the canvas. */
  pointerForce: number;
  scene: SceneParams;
  hoverIndex: number;
  hoverAmount: number;
  /** Global fade, used to bring the whole field up on first paint. */
  fade: number;
  /** Trail persistence per frame. Higher = longer filaments. */
  decay?: number;
};

export type FieldPipeline = {
  render(params: FrameParams): void;
  resize(width: number, height: number): void;
  setAttractors(attractors: Attractor[]): void;
  readonly particleCount: number;
  dispose(): void;
};

export function createFieldPipeline(options: {
  gpu: Gpu;
  api: FieldApi;
  shaders: ShaderBundle;
  output: Surface | Target;
  attractors: Attractor[];
  quality?: Quality;
}): FieldPipeline {
  const { gpu, api, shaders, output } = options;
  const quality = options.quality ?? "high";
  const { particles: particleCount, bloomDivisor } = QUALITY[quality];

  // The accumulation buffer has to be cleared once, and again after any resize
  // replaces its texture, or the first preserved pass reads uninitialised memory.
  let cleared = false;
  let attractors = options.attractors.slice(0, MAX_ATTRACTORS);
  let packed = packAttractors(attractors);
  let [width, height] = output.size;

  const half = (n: number) => Math.max(1, Math.floor(n / bloomDivisor));
  // Not /4: at 1440px wide that put the far octave at 180px, where a wide
  // 5-tap kernel stops approximating a Gaussian and starts drawing squares
  // around every bright core.
  const quarter = (n: number) => Math.max(8, Math.floor(n / (bloomDivisor * 2.5)));

  // HDR everywhere before the composite: additive particle glow overshoots 1.0
  // constantly, and clamping it early is what makes cheap bloom look muddy.
  const scene = api.target(gpu, {
    size: [width, height],
    format: "rgba16float",
    label: "field-scene",
  });
  const nearA = api.target(gpu, { size: [half(width), half(height)], format: "rgba16float", label: "bloom-near-a" });
  const nearB = api.target(gpu, { size: [half(width), half(height)], format: "rgba16float", label: "bloom-near-b" });
  const farA = api.target(gpu, { size: [quarter(width), quarter(height)], format: "rgba16float", label: "bloom-far-a" });
  const farB = api.target(gpu, { size: [quarter(width), quarter(height)], format: "rgba16float", label: "bloom-far-b" });

  const linear = api.sampler(gpu, {
    minFilter: "linear",
    magFilter: "linear",
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
  });

  const state = api.pingPongStorage(gpu, particleCount * PARTICLE_BYTES);

  const simulate = api.compute(gpu, shaders.simulate, { label: "field-simulate" });

  const particleDraw = api.draw(gpu, {
    shader: shaders.particles,
    label: "field-particles",
    blend: "additive",
    vertices: 6,
    instances: particleCount,
    depth: false,
  });

  const attractorDraw = api.draw(gpu, {
    shader: shaders.attractors,
    label: "field-attractors",
    blend: "additive",
    vertices: 6,
    instances: Math.max(1, attractors.length),
    depth: false,
  });

  // Decay-only pass: multiplies the accumulation buffer down each frame.
  const fade = api.effect(gpu, shaders.fade, {
    label: "field-fade",
    blend: { color: { src: "zero", dst: "src" }, alpha: { src: "zero", dst: "src" } },
  });

  const bright = api.effect(gpu, shaders.bright, { label: "field-bright" });

  // A horizontal and a vertical blur cannot share one effect: uniform writes
  // all land before the frame's command buffer executes, so both passes would
  // read whichever direction was set last.
  const blurNearH = api.effect(gpu, shaders.blur, { label: "blur-near-h" });
  const blurNearV = api.effect(gpu, shaders.blur, { label: "blur-near-v" });
  const blurFarH = api.effect(gpu, shaders.blur, { label: "blur-far-h" });
  const blurFarV = api.effect(gpu, shaders.blur, { label: "blur-far-v" });

  const composite = api.effect(gpu, shaders.composite, { label: "field-composite" });

  function bindResources() {
    simulate.set({ field: packed });
    attractorDraw.set({ field: packed });

    bright.set({ src: scene, samp: linear });
    blurNearH.set({ src: nearA, samp: linear });
    blurNearV.set({ src: nearB, samp: linear });
    // The far octave starts from the finished near bloom and is sampled down,
    // so one chain feeds the other instead of blurring the scene twice.
    blurFarH.set({ src: nearA, samp: linear });
    blurFarV.set({ src: farA, samp: linear });
    composite.set({
      scene,
      bloomNear: nearA,
      bloomFar: farB,
      samp: linear,
    });
  }

  function bindBlurGeometry() {
    // `radius` widens on the far octave so two cheap chains read as one very
    // large, soft bloom rather than two visibly stacked halos.
    blurNearH.set({ params: { direction: [1, 0], texel: nearA.texelSize, radius: 1.0 } });
    blurNearV.set({ params: { direction: [0, 1], texel: nearB.texelSize, radius: 1.0 } });
    // Far passes step in the coarser grid's texels, which is what makes the
    // second octave read as one very large halo rather than a second ring.
    blurFarH.set({ params: { direction: [1, 0], texel: farA.texelSize, radius: 1.35 } });
    blurFarV.set({ params: { direction: [0, 1], texel: farA.texelSize, radius: 1.35 } });
    bright.set({ params: { threshold: 0.72, knee: 0.35, amount: 0.9 } });
  }

  bindResources();
  bindBlurGeometry();

  function resize(nextWidth: number, nextHeight: number) {
    width = Math.max(1, Math.floor(nextWidth));
    height = Math.max(1, Math.floor(nextHeight));
    scene.resize([width, height]);
    nearA.resize([half(width), half(height)]);
    nearB.resize([half(width), half(height)]);
    farA.resize([quarter(width), quarter(height)]);
    farB.resize([quarter(width), quarter(height)]);
    // Resizing replaces the underlying textures, so every sampler binding that
    // points at one has to be handed the new identity.
    bindResources();
    bindBlurGeometry();
    cleared = false;
  }

  function setAttractors(next: Attractor[]) {
    attractors = next.slice(0, MAX_ATTRACTORS);
    packed = packAttractors(attractors);
    simulate.set({ field: packed });
    attractorDraw.set({ field: packed });
  }

  function render(params: FrameParams) {
    const { scene: s } = params;
    const aspect = width / Math.max(1, height);
    const scaleX = 1 / (s.zoom * aspect);
    const scaleY = 1 / s.zoom;
    const [viewX, viewY] = viewCenter(s, aspect);

    // Clamp dt: a backgrounded tab returns with a huge delta that would fling
    // the whole field apart in one step.
    const dt = Math.min(Math.max(params.dt, 1 / 240), 1 / 30);

    simulate.set({
      src: state.read,
      dst: state.write,
      sim: {
        pointer: params.pointer,
        bounds: [s.zoom * aspect * 1.15, s.zoom * 1.15],
        dt,
        time: params.time,
        count: particleCount,
        attractorCount: attractors.length,
        pointerForce: params.pointerForce,
        flow: s.flow,
        gravity: s.gravity,
        coupling: s.coupling,
        bonding: s.bonding,
        swirl: 0.18,
        focusIndex: s.focusIndex,
        focusAmount: s.focusAmount,
      },
    });
    simulate.dispatch(Math.ceil(particleCount / 64));
    state.swap();

    particleDraw.set({
      particles: state.read,
      view: {
        center: [viewX, viewY],
        scale: [scaleX, scaleY],
        viewport: [width, height],
        exposure: s.exposure * params.fade,
        // Constant on-screen size in pixels, converted to clip-x units.
        pointSize: (1.5 * 2) / width,
        time: params.time,
        trail: 0.09,
      },
    });

    attractorDraw.set({
      view: {
        center: [viewX, viewY],
        scale: [scaleX, scaleY],
        viewport: [width, height],
        glow: s.coreGlow * params.fade,
        time: params.time,
        hoverIndex: params.hoverIndex,
        hoverAmount: params.hoverAmount,
        focusIndex: s.focusIndex,
        focusAmount: s.focusAmount,
      },
    });

    composite.set({
      params: {
        resolution: [width, height],
        time: params.time,
        exposure: 1.0,
        bloomNear: 0.50,
        bloomFar: 0.62,
        vignette: 0.62,
        grain: 0.012,
        aberration: 0.022,
        fade: params.fade,
      },
    });

    fade.set({ params: { decay: params.decay ?? 0.86 } });

    api.frame(gpu, (f) => {
      // clear:false keeps last frame's light; the fade draw is what stops it
      // from accumulating to white.
      f.pass({ target: scene, clear: cleared ? false : ([0, 0, 0, 1] as const) }, (p) => {
        p.draw(fade);
        p.draw(particleDraw);
        p.draw(attractorDraw);
      });
      f.pass({ target: nearA }, (p) => p.draw(bright));
      f.pass({ target: nearB }, (p) => p.draw(blurNearH));
      f.pass({ target: nearA }, (p) => p.draw(blurNearV));
      f.pass({ target: farA }, (p) => p.draw(blurFarH));
      f.pass({ target: farB }, (p) => p.draw(blurFarV));
      f.pass({ target: output }, (p) => p.draw(composite));
    });
    cleared = true;
  }

  return {
    render,
    resize,
    setAttractors,
    particleCount,
    dispose() {
      // Targets and buffers are owned by the gpu and released with it; the
      // caller disposes the gpu.
    },
  };
}
