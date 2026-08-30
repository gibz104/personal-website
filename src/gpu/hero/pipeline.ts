import type { Gpu, Surface, Target } from "vgpu";
import type { ShaderSource } from "@vgpu/wgsl";
import { FONT_ATLAS_SIZE, fontAtlasBytes } from "../font/atlas";
import {
  buildCorpusTexture,
  CORPUS_COUNT,
  CORPUS_HEIGHT,
  CORPUS_WIDTH,
} from "../font/page";
import { markCoverage, type Ctx2D } from "../mark/draw";
import type { FieldApi } from "../pipeline";

export type HeroShaders = {
  readonly background: ShaderSource | string;
  readonly rim: ShaderSource | string;
  readonly blur: ShaderSource | string;
  readonly composite: ShaderSource | string;
};

/**
 * The flare's parameters, named as in vgpu's nextjs-flare example so the two
 * can be compared directly.
 */
export type FlarePreset = {
  /** Rim falloff with distance from the light. Higher reaches further. */
  spotReach: number;
  /** Dilation radius in pixels: how far outside the mark the glow starts. */
  spotStroke: number;
  /** Ray-march reach. Drives both step density and decay. */
  extension: number;
  beamIntensity: number;
  /** Radius of the gaussian halo around the source. */
  spotFocus: number;
  scatter: number;
  rimFill: number;
  rimIntensity: number;
  /** How much of the mark's own body is drawn. 0 keeps the letters black. */
  logoOpacity: number;
  /** Blend between the sharp and blurred rim along the ray. */
  smoothness: number;
  filmGrain: number;
  verticalEdgeFade: number;
  /** How completely the mark blacks out the matrix behind it. */
  markDarkness: number;
  flareColor: readonly [number, number, number];
};

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
  dispose(): void;
};

// Kernel from the reference: eight linear-sampled tap pairs plus a centre
// weight, giving a 33-wide gaussian for seventeen fetches.
const BLUR_CENTER_WEIGHT = 0.0799404796215474;
const BLUR_TAPS: readonly (readonly [number, number, number, number])[] = [
  [1.48500449838059, 0.15215191554518462, 0, 0],
  [3.4650570548417856, 0.12482060361420404, 0, 0],
  [5.445220764892785, 0.08739756064091182, 0, 0],
  [7.42555748318834, 0.052228984400379486, 0, 0],
  [9.406126897065857, 0.026638884372877224, 0, 0],
  [11.386985823860664, 0.011595876612829572, 0, 0],
  [13.368187582263898, 0.004307876491458321, 0, 0],
  [15, 0.0008880585113811997, 0, 0],
];

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
  const preset = options.preset;
  let frameIndex = 0;

  // Shifts which rows of the board this session is looking at, so two loads
  // never open on the same arrangement even before the epochs diverge. Derived
  // from the seed, so the preview stays reproducible.
  const seed = options.gridSeed ?? 7;
  const rowOffset = (Math.imul(seed, 2654435761) >>> 9) % 4096;

  // Every stage runs at full resolution, as in the reference. The rim's
  // dilation is the expensive part and it is what keeps the glow's edge crisp.
  const plate = api.target(gpu, { size: [width, height], format: "rgba16float", label: "hero-plate" });
  const rimTarget = api.target(gpu, { size: [width, height], format: "rgba16float", label: "hero-rim" });
  const rimA = api.target(gpu, { size: [width, height], format: "rgba16float", label: "hero-rim-a" });
  const rimB = api.target(gpu, { size: [width, height], format: "rgba16float", label: "hero-rim-b" });

  const linear = api.sampler(gpu, {
    minFilter: "linear",
    magFilter: "linear",
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
  });

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

  const corpus = gpu.gpu.createTexture({
    label: "corpus",
    size: [CORPUS_WIDTH, CORPUS_HEIGHT],
    format: "rg8uint",
    usage: COPY_DST | TEXTURE_BINDING,
  });
  // 128 cells x 2 bytes = 256, exactly WebGPU's row alignment.
  gpu.gpu.queue.writeTexture(
    { texture: corpus },
    buildCorpusTexture(),
    { bytesPerRow: CORPUS_WIDTH * 2, rowsPerImage: CORPUS_HEIGHT },
    [CORPUS_WIDTH, CORPUS_HEIGHT],
  );

  let mark: GPUTexture | undefined;

  function buildMark() {
    mark?.destroy();
    const texture = gpu.gpu.createTexture({
      label: "hero-mark",
      size: [width, height],
      format: "rg8unorm",
      usage: COPY_DST | TEXTURE_BINDING,
    });
    const surface = canvas(width, height);
    const ctx = surface.getContext("2d");
    if (!ctx) throw new Error("hero: 2D context unavailable for the mark");
    const bytesPerRow = Math.ceil((width * 2) / 256) * 256;
    gpu.gpu.queue.writeTexture(
      { texture },
      padRows(markCoverage(ctx, width, height), width * 2, height, bytesPerRow),
      { bytesPerRow, rowsPerImage: height },
      [width, height],
    );
    mark = texture;
    return texture;
  }
  buildMark();

  const background = api.effect(gpu, options.shaders.background, { label: "hero-bg" });
  const rim = api.effect(gpu, options.shaders.rim, { label: "hero-rim" });
  const blurH = api.effect(gpu, options.shaders.blur, { label: "hero-blur-h" });
  const blurV = api.effect(gpu, options.shaders.blur, { label: "hero-blur-v" });
  const composite = api.effect(gpu, options.shaders.composite, { label: "hero-composite" });

  function bind() {
    background.set({ atlas, samp: linear, corpus });
    rim.set({ linearSampler: linear, sceneTexture: mark! });
    blurH.set({ linearSampler: linear, sourceTexture: rimTarget });
    blurV.set({ linearSampler: linear, sourceTexture: rimA });
    composite.set({
      linearSampler: linear,
      sceneTexture: mark!,
      rimTexture: rimTarget,
      rimBlurTexture: rimB,
      plateTexture: plate,
    });

    const texel: [number, number] = [1 / width, 1 / height];
    const blurParams = {
      texelSize: texel,
      taps: BLUR_TAPS.map((t) => [...t] as [number, number, number, number]),
      centerWeight: BLUR_CENTER_WEIGHT,
      tapCount: BLUR_TAPS.length,
    };
    blurH.set({ params: { ...blurParams, direction: [texel[0], 0] } });
    blurV.set({ params: { ...blurParams, direction: [0, texel[1]] } });
  }
  bind();

  function resize(nextWidth: number, nextHeight: number) {
    width = Math.max(1, Math.floor(nextWidth));
    height = Math.max(1, Math.floor(nextHeight));
    plate.resize([width, height]);
    rimTarget.resize([width, height]);
    rimA.resize([width, height]);
    rimB.resize([width, height]);
    buildMark();
    bind();
  }

  function render(frame: HeroFrame) {
    const reference = Math.min(width, height);
    // The reference measures distance in units of the short edge, so a wide
    // viewport does not stretch the halo into an ellipse.
    const aspect: [number, number] = [width / reference, height / reference];
    const centre: [number, number] = [0.5, 0.5];

    // The source drifts on its own and hands over to the pointer, in UV space
    // because that is what the rim and composite both work in.
    const drift: [number, number] = [
      centre[0] + Math.sin(frame.time * 0.21) * 0.17,
      centre[1] + Math.cos(frame.time * 0.17) * 0.11,
    ];
    const followed: [number, number] = [
      frame.pointer[0] / width,
      frame.pointer[1] / height,
    ];
    const light: [number, number] = [
      drift[0] + (followed[0] - drift[0]) * frame.pointerActive,
      drift[1] + (followed[1] - drift[1]) * frame.pointerActive,
    ];

    background.set({
      params: {
        resolution: [width, height],
        time: frame.time,
        corpusCount: CORPUS_COUNT,
        rowOffset,
        intro: frame.intro,
      },
    });

    rim.set({
      params: {
        light,
        sceneTexel: [1 / width, 1 / height],
        aspect,
        spotReach: preset.spotReach,
        spotStroke: preset.spotStroke,
      },
    });

    composite.set({
      params: {
        light,
        aspect,
        logoCenter: centre,
        flareColor: preset.flareColor,
        rimIntensity: preset.rimIntensity,
        extension: preset.extension,
        beamIntensity: preset.beamIntensity,
        filmGrain: preset.filmGrain,
        smoothness: preset.smoothness,
        logoOpacity: preset.logoOpacity,
        frameIndex,
        spotFocus: preset.spotFocus,
        scatter: preset.scatter,
        rimFill: preset.rimFill,
        verticalEdgeFade: preset.verticalEdgeFade,
        markDarkness: preset.markDarkness,
        fade: frame.intro,
      },
    });

    api.frame(gpu, (f) => {
      f.pass({ target: plate, clear: [0, 0, 0, 1] }, (p) => p.draw(background));
      f.pass({ target: rimTarget }, (p) => p.draw(rim));
      f.pass({ target: rimA }, (p) => p.draw(blurH));
      f.pass({ target: rimB }, (p) => p.draw(blurV));
      f.pass({ target: output }, (p) => p.draw(composite));
    });

    frameIndex = (frameIndex + 1) >>> 0;
  }

  return {
    render,
    resize,
    dispose() {
      atlas.destroy();
      corpus.destroy();
      mark?.destroy();
    },
  };
}
