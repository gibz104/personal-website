import type { Gpu, Surface, Target } from "vgpu";
import type { ShaderSource } from "@vgpu/wgsl";
import { FONT_ATLAS_SIZE, fontAtlasBytes } from "../font/atlas";
import { buildCodeGrid, GRID_COLS, GRID_ROWS } from "../font/grid";
import { markCoverage, type Ctx2D } from "../mark/draw";
import type { FieldApi } from "../pipeline";

export type HeroShaders = {
  readonly background: ShaderSource | string;
  readonly flare: ShaderSource | string;
  readonly blur: ShaderSource | string;
  readonly bright: ShaderSource | string;
  readonly composite: ShaderSource | string;
};

/** How the light behaves around the mark. */
export type FlarePreset = {
  /** Radius of the emissive core, as a fraction of the short edge. */
  core: number;
  /** Falloff distance, as a fraction of the short edge. Higher reaches further. */
  reach: number;
  /** Weight of the marched shafts. */
  shafts: number;
  /** Weight of the soft unoccluded pool. */
  halo: number;
  intensity: number;
  /** Weight of the contour highlight along the mark's lit edge. */
  rim: number;
  /** Weight of the bloom on the character plate. */
  bloom: number;
  flareWeight: number;
};

/** Anything that can hand back a 2D context. The DOM and @napi-rs/canvas both do. */
export type CanvasFactory = (
  width: number,
  height: number,
) => { getContext(type: "2d"): Ctx2D | null };

export type HeroFrame = {
  time: number;
  dt: number;
  /** Pointer in backing pixels, canvas-relative. */
  pointer: readonly [number, number];
  pointerActive: number;
  intro: number;
};

export type HeroPipeline = {
  render(frame: HeroFrame): void;
  resize(width: number, height: number): void;
  setPreset(preset: FlarePreset): void;
  dispose(): void;
};

/** Pixels per second the character plate drifts upward. */
export const SCROLL_SPEED = 17;

const TEXTURE_BINDING = 0x04;
const COPY_DST = 0x02;

function padRows(src: Uint8Array, width: number, height: number, bytesPerRow: number) {
  const padded = new Uint8Array(bytesPerRow * height);
  for (let y = 0; y < height; y++) {
    padded.set(src.subarray(y * width, (y + 1) * width), y * bytesPerRow);
  }
  return padded;
}

export function createHeroPipeline(options: {
  gpu: Gpu;
  api: FieldApi;
  shaders: HeroShaders;
  output: Surface | Target;
  canvas: CanvasFactory;
  preset: FlarePreset;
  gridSeed?: number;
}): HeroPipeline {
  const { gpu, api, output, canvas } = options;
  let [width, height] = output.size;
  let preset = options.preset;

  const half = (n: number) => Math.max(1, Math.floor(n / 2));

  const plate = api.target(gpu, { size: [width, height], format: "rgba16float", label: "hero-plate" });
  const nearA = api.target(gpu, { size: [half(width), half(height)], format: "rgba16float", label: "hero-bloom-a" });
  const nearB = api.target(gpu, { size: [half(width), half(height)], format: "rgba16float", label: "hero-bloom-b" });
  const flareA = api.target(gpu, { size: [half(width), half(height)], format: "rgba16float", label: "hero-flare-a" });
  const flareB = api.target(gpu, { size: [half(width), half(height)], format: "rgba16float", label: "hero-flare-b" });

  const linear = api.sampler(gpu, {
    minFilter: "linear",
    magFilter: "linear",
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
  });

  // --- static resources ---------------------------------------------------
  const atlasSize = FONT_ATLAS_SIZE;
  const atlas = gpu.gpu.createTexture({
    label: "font-atlas",
    size: [atlasSize[0], atlasSize[1]],
    format: "r8unorm",
    usage: COPY_DST | TEXTURE_BINDING,
  });
  {
    const bytesPerRow = Math.ceil(atlasSize[0] / 256) * 256;
    gpu.gpu.queue.writeTexture(
      { texture: atlas },
      padRows(fontAtlasBytes(), atlasSize[0], atlasSize[1], bytesPerRow),
      { bytesPerRow, rowsPerImage: atlasSize[1] },
      [atlasSize[0], atlasSize[1]],
    );
  }

  const grid = gpu.gpu.createTexture({
    label: "code-grid",
    size: [GRID_COLS, GRID_ROWS],
    format: "rg8uint",
    usage: COPY_DST | TEXTURE_BINDING,
  });
  gpu.gpu.queue.writeTexture(
    { texture: grid },
    buildCodeGrid(options.gridSeed),
    { bytesPerRow: GRID_COLS * 2, rowsPerImage: GRID_ROWS },
    [GRID_COLS, GRID_ROWS],
  );

  // --- the mark, redrawn at every size ------------------------------------
  let mark: GPUTexture | undefined;

  function buildMark() {
    mark?.destroy();
    const texture = gpu.gpu.createTexture({
      label: "hero-mark",
      size: [width, height],
      format: "r8unorm",
      usage: COPY_DST | TEXTURE_BINDING,
    });
    const surface = canvas(width, height);
    const ctx = surface.getContext("2d");
    if (!ctx) throw new Error("hero: 2D context unavailable for the mark");
    const bytesPerRow = Math.ceil(width / 256) * 256;
    gpu.gpu.queue.writeTexture(
      { texture },
      padRows(markCoverage(ctx, width, height), width, height, bytesPerRow),
      { bytesPerRow, rowsPerImage: height },
      [width, height],
    );
    mark = texture;
    return texture;
  }
  buildMark();

  const background = api.effect(gpu, options.shaders.background, { label: "hero-bg" });
  const flare = api.effect(gpu, options.shaders.flare, { label: "hero-flare" });
  const bright = api.effect(gpu, options.shaders.bright, { label: "hero-bright" });
  const bloomH = api.effect(gpu, options.shaders.blur, { label: "hero-bloom-h" });
  const bloomV = api.effect(gpu, options.shaders.blur, { label: "hero-bloom-v" });
  const flareH = api.effect(gpu, options.shaders.blur, { label: "hero-flare-h" });
  const flareV = api.effect(gpu, options.shaders.blur, { label: "hero-flare-v" });
  const composite = api.effect(gpu, options.shaders.composite, { label: "hero-composite" });

  function bind() {
    background.set({ atlas, samp: linear, grid });
    flare.set({ mark: mark!, samp: linear });
    bright.set({ src: plate, samp: linear, params: { threshold: 0.80, knee: 0.30, amount: 1.0 } });
    bloomH.set({ src: nearA, samp: linear, params: { direction: [1, 0], texel: nearA.texelSize, radius: 1.0 } });
    bloomV.set({ src: nearB, samp: linear, params: { direction: [0, 1], texel: nearB.texelSize, radius: 1.0 } });
    // The flare is blurred wider than the bloom: it stands in for scattering,
    // and a tight blur leaves the marched steps visible as banding.
    flareH.set({ src: flareA, samp: linear, params: { direction: [1, 0], texel: flareA.texelSize, radius: 2.6 } });
    flareV.set({ src: flareB, samp: linear, params: { direction: [0, 1], texel: flareA.texelSize, radius: 2.6 } });
    composite.set({ plate, bloom: nearA, flare: flareA, mark: mark!, samp: linear });
  }
  bind();

  function resize(nextWidth: number, nextHeight: number) {
    width = Math.max(1, Math.floor(nextWidth));
    height = Math.max(1, Math.floor(nextHeight));
    plate.resize([width, height]);
    nearA.resize([half(width), half(height)]);
    nearB.resize([half(width), half(height)]);
    flareA.resize([half(width), half(height)]);
    flareB.resize([half(width), half(height)]);
    buildMark();
    bind();
  }

  function render(frame: HeroFrame) {
    const short = Math.min(width, height);
    const centre: [number, number] = [width / 2, height / 2];

    // The source lives behind the mark and follows the pointer at partial
    // amplitude, so it sweeps across the letterforms instead of leaving them.
    const drift: [number, number] = [
      centre[0] + Math.sin(frame.time * 0.21) * short * 0.16,
      centre[1] + Math.cos(frame.time * 0.17) * short * 0.10,
    ];
    const followed: [number, number] = [
      centre[0] + (frame.pointer[0] - centre[0]) * 0.58,
      centre[1] + (frame.pointer[1] - centre[1]) * 0.58,
    ];
    const light: [number, number] = [
      drift[0] + (followed[0] - drift[0]) * frame.pointerActive,
      drift[1] + (followed[1] - drift[1]) * frame.pointerActive,
    ];

    background.set({
      params: {
        resolution: [width, height],
        scroll: [0, frame.time * SCROLL_SPEED],
        time: frame.time,
        intro: frame.intro,
      },
    });

    flare.set({
      flare: {
        resolution: [width, height],
        light,
        core: preset.core,
        reach: preset.reach,
        shafts: preset.shafts,
        halo: preset.halo,
        intensity: preset.intensity,
      },
    });

    composite.set({
      params: {
        resolution: [width, height],
        light,
        time: frame.time,
        bloom: preset.bloom,
        flareWeight: preset.flareWeight,
        rim: preset.rim,
        vignette: 0.52,
        grain: 0.012,
        fade: frame.intro,
      },
    });

    api.frame(gpu, (f) => {
      f.pass({ target: plate, clear: [0, 0, 0, 1] }, (p) => p.draw(background));
      f.pass({ target: nearA }, (p) => p.draw(bright));
      f.pass({ target: nearB }, (p) => p.draw(bloomH));
      f.pass({ target: nearA }, (p) => p.draw(bloomV));
      f.pass({ target: flareA }, (p) => p.draw(flare));
      f.pass({ target: flareB }, (p) => p.draw(flareH));
      f.pass({ target: flareA }, (p) => p.draw(flareV));
      f.pass({ target: output }, (p) => p.draw(composite));
    });
  }

  return {
    render,
    resize,
    setPreset(next) {
      preset = next;
    },
    dispose() {
      atlas.destroy();
      grid.destroy();
      mark?.destroy();
    },
  };
}
