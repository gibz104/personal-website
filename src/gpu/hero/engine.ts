import type { Gpu, Surface } from "vgpu";
import { isWebGPUAvailable, prefersReducedMotion } from "../engine";
import { createHeroPipeline, type HeroPipeline } from "./pipeline";
import { heroVariantById, HERO_VARIANTS } from "./presets";
import background from "../shaders/hero-bg.wgsl";
import blur from "../shaders/blur.wgsl";
import bright from "../shaders/bright.wgsl";
import composite from "../shaders/hero-composite.wgsl";
import flare from "../shaders/flare.wgsl";

export type HeroEngine = {
  readonly ready: Promise<boolean>;
  dispose(): void;
};

/** How long the scene runs before a reduced-motion viewer's frame is frozen. */
const SETTLE_SECONDS = 6;

export function createHeroEngine(
  canvas: HTMLCanvasElement,
  variantId: string,
): HeroEngine {
  const variant = heroVariantById(variantId) ?? HERO_VARIANTS[0]!;
  const reduced = prefersReducedMotion();

  let disposed = false;
  let gpu: Gpu | undefined;
  let output: Surface | undefined;
  let pipeline: HeroPipeline | undefined;
  let raf = 0;
  let observer: ResizeObserver | undefined;

  let css = { width: 1, height: 1 };
  let pointer: [number, number] = [0, 0];
  let pointerActive = 0;
  let pointerGoal = 0;
  let intro = 0;
  let elapsed = 0;
  let last = 0;

  const gridSeed = Math.floor(Math.random() * 100_000) + 1;

  function measure() {
    const rect = canvas.getBoundingClientRect();
    css = {
      width: Math.max(1, Math.round(rect.width)),
      height: Math.max(1, Math.round(rect.height)),
    };
  }

  function applySize() {
    if (disposed || !output || !pipeline) return;
    measure();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(css.width * dpr));
    const height = Math.max(1, Math.round(css.height * dpr));
    if (output.size[0] === width && output.size[1] === height) return;
    output.resize([width, height]);
    pipeline.resize(output.size[0], output.size[1]);
  }

  const onPointerMove = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    pointer = [(event.clientX - rect.left) * dpr, (event.clientY - rect.top) * dpr];
    pointerGoal = 1;
  };
  const onLeave = () => {
    pointerGoal = 0;
  };

  function tick(now: number) {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    if (!pipeline) return;

    const dt = last === 0 ? 1 / 60 : Math.min((now - last) / 1000, 1 / 20);
    last = now;
    elapsed += dt;
    intro = Math.min(1, intro + dt * 0.7);
    pointerActive += (pointerGoal - pointerActive) * (1 - Math.exp(-dt * 5));

    if (reduced && elapsed > SETTLE_SECONDS) return;

    pipeline.render({ time: elapsed, dt, pointer, pointerActive, intro });
  }

  async function start(): Promise<boolean> {
    if (!isWebGPUAvailable()) return false;
    const api = await import("vgpu");
    if (disposed) return false;

    gpu = await api.init({ label: `hero-${variant.id}` });
    if (disposed) {
      gpu.dispose();
      return false;
    }

    measure();
    output = api.surface(gpu, canvas, {
      autoResize: false,
      alphaMode: "opaque",
      dpr: [1, 2],
    });

    pipeline = createHeroPipeline({
      gpu,
      api,
      shaders: { background, flare, blur, bright, composite },
      output,
      canvas: (w, h) => {
        const surface = document.createElement("canvas");
        surface.width = w;
        surface.height = h;
        return surface as never;
      },
      preset: variant.preset,
      gridSeed,
    });
    applySize();

    if (!reduced) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.documentElement.addEventListener("mouseleave", onLeave);
    }

    observer = new ResizeObserver(applySize);
    observer.observe(canvas);
    raf = requestAnimationFrame(tick);
    return true;
  }

  const ready = start().catch((error: unknown) => {
    console.error(`[hero:${variant.id}] initialisation failed`, error);
    return false;
  });

  return {
    ready,
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      try {
        pipeline?.dispose();
        gpu?.dispose();
      } catch {
        // Teardown races with an in-flight init; nothing useful to do.
      }
    },
  };
}
