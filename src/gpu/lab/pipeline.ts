import type { Gpu, Surface, Target } from "vgpu";
import type { ShaderSource } from "@vgpu/wgsl";
import {
  FONT_ATLAS_SIZE,
  fontAtlasBytes,
} from "../font/atlas";
import { buildCodeGrid, GRID_COLS, GRID_ROWS } from "../font/grid";
import type { FieldApi } from "../pipeline";

/** Bloom + grade shaders, shared by every concept. */
export type LabShaders = {
  readonly bright: ShaderSource | string;
  readonly blur: ShaderSource | string;
  readonly composite: ShaderSource | string;
};

export type ConceptFrame = {
  time: number;
  /** Pointer in CSS pixels, canvas-relative. */
  pointer: readonly [number, number];
  /** 0 when the pointer has never been over the page, easing to 1. */
  pointerActive: number;
  /** Seconds since the last click; large when there has not been one. */
  clickAge: number;
  /** Entrance ramp, 0..1. */
  intro: number;
};

export type LabPipeline = {
  render(frame: ConceptFrame): void;
  resize(width: number, height: number): void;
  dispose(): void;
};

const TEXTURE_BINDING = 0x04;
const COPY_DST = 0x02;

/** Uploads the committed glyph atlas as a single-channel texture. */
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

/** Uploads the code page: glyph index in R, token class in G. */
function createGridTexture(gpu: Gpu): GPUTexture {
  const texture = gpu.gpu.createTexture({
    label: "code-grid",
    size: [GRID_COLS, GRID_ROWS],
    format: "rg8uint",
    usage: COPY_DST | TEXTURE_BINDING,
  });
  // 256 cells x 2 bytes = 512, already 256-aligned.
  gpu.gpu.queue.writeTexture(
    { texture },
    buildCodeGrid(),
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
  output: Surface | Target;
}): LabPipeline {
  const { gpu, api, output } = options;
  let [width, height] = output.size;

  const half = (n: number) => Math.max(1, Math.floor(n / 2));
  const quarter = (n: number) => Math.max(8, Math.floor(n / 5));

  const sceneTarget = api.target(gpu, { size: [width, height], format: "rgba16float", label: "lab-scene" });
  const nearA = api.target(gpu, { size: [half(width), half(height)], format: "rgba16float", label: "lab-near-a" });
  const nearB = api.target(gpu, { size: [half(width), half(height)], format: "rgba16float", label: "lab-near-b" });
  const farA = api.target(gpu, { size: [quarter(width), quarter(height)], format: "rgba16float", label: "lab-far-a" });
  const farB = api.target(gpu, { size: [quarter(width), quarter(height)], format: "rgba16float", label: "lab-far-b" });

  const linear = api.sampler(gpu, {
    minFilter: "linear",
    magFilter: "linear",
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
  });

  const atlas = createAtlasTexture(gpu);
  const grid = createGridTexture(gpu);

  const conceptEffect = api.effect(gpu, options.scene, { label: "lab-concept" });
  const bright = api.effect(gpu, options.shaders.bright, { label: "lab-bright" });
  const blurNearH = api.effect(gpu, options.shaders.blur, { label: "lab-blur-near-h" });
  const blurNearV = api.effect(gpu, options.shaders.blur, { label: "lab-blur-near-v" });
  const blurFarH = api.effect(gpu, options.shaders.blur, { label: "lab-blur-far-h" });
  const blurFarV = api.effect(gpu, options.shaders.blur, { label: "lab-blur-far-v" });
  const composite = api.effect(gpu, options.shaders.composite, { label: "lab-composite" });

  function bind() {
    conceptEffect.set({ atlas, samp: linear, grid });
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
    bind();
  }

  function render(frame: ConceptFrame) {
    conceptEffect.set({
      params: {
        resolution: [width, height],
        pointer: frame.pointer,
        time: frame.time,
        pointerActive: frame.pointerActive,
        clickAge: frame.clickAge,
        intro: frame.intro,
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
      f.pass({ target: sceneTarget, clear: [0, 0, 0, 1] }, (p) => p.draw(conceptEffect));
      f.pass({ target: nearA }, (p) => p.draw(bright));
      f.pass({ target: nearB }, (p) => p.draw(blurNearH));
      f.pass({ target: nearA }, (p) => p.draw(blurNearV));
      f.pass({ target: farA }, (p) => p.draw(blurFarH));
      f.pass({ target: farB }, (p) => p.draw(blurFarV));
      f.pass({ target: output }, (p) => p.draw(composite));
    });
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
