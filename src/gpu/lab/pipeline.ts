import type { Gpu, Surface, Target } from "vgpu";
import type { ShaderSource } from "@vgpu/wgsl";
import { FONT_ATLAS_SIZE, fontAtlasBytes } from "../font/atlas";
import { buildCodeGrid, GRID_COLS, GRID_ROWS } from "../font/grid";
import type { FieldApi } from "../pipeline";

/** Bloom, grade, and the persistent reveal pass — shared by every variant. */
export type LabShaders = {
  readonly reveal: ShaderSource | string;
  readonly bright: ShaderSource | string;
  readonly blur: ShaderSource | string;
  readonly composite: ShaderSource | string;
};

/** How a variant wants the persistent field to behave. */
export type RevealTuning = {
  /** Per-frame multiplier. Higher holds the trail longer. */
  decay: number;
  /** Brush radius, as a fraction of the short edge. */
  radius: number;
  strength: number;
  /** Click stamp radius, as a fraction of the short edge. */
  clickRadius: number;
  /** Neighbour bleed per frame. Above zero the field spreads on its own. */
  spread: number;
};

/** Pixels per second the code drifts upward. */
export const SCROLL_SPEED = 17;

export type ConceptFrame = {
  time: number;
  dt: number;
  /** Pointer in backing pixels, canvas-relative. */
  pointer: readonly [number, number];
  /** Where it was last frame, so the brush can stamp the whole segment. */
  previousPointer: readonly [number, number];
  /** Where the last click landed. */
  click: readonly [number, number];
  pointerActive: number;
  /** Seconds since the last click; large when there has not been one. */
  clickAge: number;
  /** Smoothed pointer speed in pixels per second. */
  speed: number;
  intro: number;
};

export type LabPipeline = {
  render(frame: ConceptFrame): void;
  resize(width: number, height: number): void;
  dispose(): void;
};

const TEXTURE_BINDING = 0x04;
const COPY_DST = 0x02;

function createAtlasTexture(gpu: Gpu): GPUTexture {
  const [w, h] = FONT_ATLAS_SIZE;
  const texture = gpu.gpu.createTexture({
    label: "font-atlas",
    size: [w, h],
    format: "r8unorm",
    usage: COPY_DST | TEXTURE_BINDING,
  });
  // WebGPU wants rows aligned to 256 bytes; the atlas is 192 wide, so it needs
  // padding even though the source is tightly packed.
  const bytesPerRow = Math.ceil(w / 256) * 256;
  const src = fontAtlasBytes();
  const padded = new Uint8Array(bytesPerRow * h);
  for (let y = 0; y < h; y++) padded.set(src.subarray(y * w, (y + 1) * w), y * bytesPerRow);
  gpu.gpu.queue.writeTexture({ texture }, padded, { bytesPerRow, rowsPerImage: h }, [w, h]);
  return texture;
}

function createGridTexture(gpu: Gpu, seed?: number): GPUTexture {
  const texture = gpu.gpu.createTexture({
    label: "code-grid",
    size: [GRID_COLS, GRID_ROWS],
    format: "rg8uint",
    usage: COPY_DST | TEXTURE_BINDING,
  });
  // 256 cells x 2 bytes = 512, already 256-aligned.
  gpu.gpu.queue.writeTexture(
    { texture },
    buildCodeGrid(seed),
    { bytesPerRow: GRID_COLS * 2, rowsPerImage: GRID_ROWS },
    [GRID_COLS, GRID_ROWS],
  );
  return texture;
}

export function createLabPipeline(options: {
  gpu: Gpu;
  api: FieldApi;
  scene: ShaderSource | string;
  shaders: LabShaders;
  tuning: RevealTuning;
  output: Surface | Target;
  /** Layout seed. Varying it per visit gives repeat visitors a new page. */
  gridSeed?: number;
}): LabPipeline {
  const { gpu, api, output, tuning } = options;
  let [width, height] = output.size;

  const half = (n: number) => Math.max(1, Math.floor(n / 2));
  const quarter = (n: number) => Math.max(8, Math.floor(n / 5));

  const sceneTarget = api.target(gpu, { size: [width, height], format: "rgba16float", label: "lab-scene" });
  const nearA = api.target(gpu, { size: [half(width), half(height)], format: "rgba16float", label: "lab-near-a" });
  const nearB = api.target(gpu, { size: [half(width), half(height)], format: "rgba16float", label: "lab-near-b" });
  const farA = api.target(gpu, { size: [quarter(width), quarter(height)], format: "rgba16float", label: "lab-far-a" });
  const farB = api.target(gpu, { size: [quarter(width), quarter(height)], format: "rgba16float", label: "lab-far-b" });

  // The reveal field is smooth, so half resolution is plenty and keeps the
  // extra pass cheap.
  // Ping-pong is done by alternating which effect draws into which target, so
  // the targets themselves never need swapping.
  const revealRead = api.target(gpu, { size: [half(width), half(height)], format: "rgba16float", label: "reveal-a" });
  const revealWrite = api.target(gpu, { size: [half(width), half(height)], format: "rgba16float", label: "reveal-b" });

  const linear = api.sampler(gpu, {
    minFilter: "linear",
    magFilter: "linear",
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
  });

  const atlas = createAtlasTexture(gpu);
  const grid = createGridTexture(gpu, options.gridSeed);

  const conceptEffect = api.effect(gpu, options.scene, { label: "lab-concept" });
  // Two reveal effects, alternated: one pass reads A and writes B, the next
  // reads B and writes A. A single effect cannot hold both bindings, because
  // set() writes land before the frame's command buffer executes.
  const revealAB = api.effect(gpu, options.shaders.reveal, { label: "reveal-ab" });
  const revealBA = api.effect(gpu, options.shaders.reveal, { label: "reveal-ba" });
  const bright = api.effect(gpu, options.shaders.bright, { label: "lab-bright" });
  const blurNearH = api.effect(gpu, options.shaders.blur, { label: "lab-blur-near-h" });
  const blurNearV = api.effect(gpu, options.shaders.blur, { label: "lab-blur-near-v" });
  const blurFarH = api.effect(gpu, options.shaders.blur, { label: "lab-blur-far-h" });
  const blurFarV = api.effect(gpu, options.shaders.blur, { label: "lab-blur-far-v" });
  const composite = api.effect(gpu, options.shaders.composite, { label: "lab-composite" });

  /** True when the next frame should read A and write B. */
  let readingA = true;
  let cleared = false;

  function bind() {
    conceptEffect.set({ atlas, samp: linear, grid });
    revealAB.set({ src: revealRead, samp: linear });
    revealBA.set({ src: revealWrite, samp: linear });
    bright.set({ src: sceneTarget, samp: linear, params: { threshold: 0.75, knee: 0.32, amount: 1.0 } });
    blurNearH.set({ src: nearA, samp: linear, params: { direction: [1, 0], texel: nearA.texelSize, radius: 1.0 } });
    blurNearV.set({ src: nearB, samp: linear, params: { direction: [0, 1], texel: nearB.texelSize, radius: 1.0 } });
    blurFarH.set({ src: nearA, samp: linear, params: { direction: [1, 0], texel: farA.texelSize, radius: 1.4 } });
    blurFarV.set({ src: farA, samp: linear, params: { direction: [0, 1], texel: farA.texelSize, radius: 1.4 } });
    composite.set({ scene: sceneTarget, bloomNear: nearA, bloomFar: farB, samp: linear });
  }
  bind();

  function resize(nextWidth: number, nextHeight: number) {
    width = Math.max(1, Math.floor(nextWidth));
    height = Math.max(1, Math.floor(nextHeight));
    sceneTarget.resize([width, height]);
    nearA.resize([half(width), half(height)]);
    nearB.resize([half(width), half(height)]);
    farA.resize([quarter(width), quarter(height)]);
    farB.resize([quarter(width), quarter(height)]);
    revealRead.resize([half(width), half(height)]);
    revealWrite.resize([half(width), half(height)]);
    bind();
    // New textures hold garbage; the first reveal pass must clear rather than
    // accumulate onto it.
    cleared = false;
  }

  function render(frame: ConceptFrame) {
    const short = Math.min(width, height);
    // The page drifts upward. Sampling the grid at a growing y offset reads
    // content further down, so the text appears to rise.
    const scrollY = frame.time * SCROLL_SPEED;
    const scrollDelta = frame.dt * SCROLL_SPEED;

    // The reveal pass runs at half resolution, so pointer coordinates have to
    // be halved to land in the same place.
    const scale = 0.5;
    const revealSize: readonly [number, number] = [half(width), half(height)];

    const source = readingA ? revealAB : revealBA;
    const destination = readingA ? revealWrite : revealRead;
    const current = readingA ? revealWrite : revealRead;

    source.set({
      reveal: {
        resolution: revealSize,
        pointer: [frame.pointer[0] * scale, frame.pointer[1] * scale],
        previous: [frame.previousPointer[0] * scale, frame.previousPointer[1] * scale],
        click: [frame.click[0] * scale, frame.click[1] * scale],
        scrollDelta: [0, scrollDelta * scale],
        radius: tuning.radius * short * scale,
        strength: tuning.strength,
        decay: tuning.decay,
        clickAge: frame.clickAge,
        clickRadius: tuning.clickRadius * short * scale,
        pointerActive: frame.pointerActive,
        spread: tuning.spread,
      },
    });

    conceptEffect.set({
      field: current,
      params: {
        resolution: [width, height],
        pointer: frame.pointer,
        previousPointer: frame.previousPointer,
        click: frame.click,
        scroll: [0, scrollY],
        time: frame.time,
        pointerActive: frame.pointerActive,
        clickAge: frame.clickAge,
        intro: frame.intro,
        speed: frame.speed,
      },
    });

    composite.set({
      params: {
        resolution: [width, height],
        time: frame.time,
        exposure: 1.0,
        bloomNear: 0.34,
        bloomFar: 0.46,
        vignette: 0.55,
        grain: 0.014,
        aberration: 0.005,
        fade: frame.intro,
      },
    });

    api.frame(gpu, (f) => {
      f.pass(
        { target: destination, clear: cleared ? false : ([0, 0, 0, 1] as const) },
        (p) => p.draw(source),
      );
      f.pass({ target: sceneTarget, clear: [0, 0, 0, 1] }, (p) => p.draw(conceptEffect));
      f.pass({ target: nearA }, (p) => p.draw(bright));
      f.pass({ target: nearB }, (p) => p.draw(blurNearH));
      f.pass({ target: nearA }, (p) => p.draw(blurNearV));
      f.pass({ target: farA }, (p) => p.draw(blurFarH));
      f.pass({ target: farB }, (p) => p.draw(blurFarV));
      f.pass({ target: output }, (p) => p.draw(composite));
    });

    cleared = true;
    readingA = !readingA;
  }

  return {
    render,
    resize,
    dispose() {
      atlas.destroy();
      grid.destroy();
    },
  };
}
