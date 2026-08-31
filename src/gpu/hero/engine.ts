import type { Gpu, Surface } from "vgpu";
import {
  isTouchPrimary,
  isWebGPUAvailable,
  prefersReducedMotion,
  requestOrientationAccess,
} from "../support";
import { createHeroPipeline, type HeroPipeline } from "./pipeline";
import { heroVariantById, HERO_VARIANTS } from "./presets";
import { DEFAULT_FACE, faceById, type MarkFace } from "../mark/faces";
import background from "../shaders/hero-bg.wgsl";
import blur from "../shaders/flare-blur.wgsl";
import composite from "../shaders/flare-composite.wgsl";
import rim from "../shaders/flare-rim.wgsl";

export type HeroEngine = {
  readonly ready: Promise<boolean>;
  /** Redraws the monogram in a different face, without a reload. */
  setFace(face: MarkFace): Promise<void>;
  dispose(): void;
};

/** How long the scene runs before a reduced-motion viewer's frame is frozen. */
const SETTLE_SECONDS = 6;

/**
 * Waits for a face's file before anything is rasterised.
 *
 * The mark is drawn to a texture once. If the font arrives after that, nothing
 * redraws and the mark silently keeps the fallback — which is why the CSS uses
 * font-display: block and why this is awaited rather than fired off.
 */
async function loadFace(face: MarkFace): Promise<void> {
  if (!face.file || typeof document === "undefined") return;
  try {
    await document.fonts.load(`${face.weight} 100px ${face.family}`, "RG");
    await document.fonts.ready;
  } catch {
    // A face that will not load falls back; the mark still draws.
  }
}

export function createHeroEngine(
  canvas: HTMLCanvasElement,
  variantId: string,
  faceId?: string,
): HeroEngine {
  const variant = heroVariantById(variantId) ?? HERO_VARIANTS[0]!;
  const face = (faceId ? faceById(faceId) : undefined) ?? DEFAULT_FACE;
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

  // On a phone there is no hover, so the light would sit in its idle drift for
  // the whole visit. Tilt drives it instead: the source swings as the device
  // does, which is the same gesture as moving a mouse, done with the hand that
  // is already holding the screen.
  const touchPrimary = isTouchPrimary();
  let tilt: [number, number] | undefined;
  let orientationBound = false;
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
    // A real touch outranks the gyroscope for as long as it lasts.
    tilt = undefined;
  };
  const onLeave = () => {
    pointerGoal = 0;
  };

  const onOrientation = (event: DeviceOrientationEvent) => {
    const { beta, gamma } = event;
    if (beta === null || gamma === null) return;
    // gamma is the left-right roll; beta the front-back pitch, which sits near
    // 45 degrees when a phone is held at a comfortable reading angle.
    const x = Math.max(-1, Math.min(1, gamma / 38));
    const y = Math.max(-1, Math.min(1, (beta - 45) / 38));
    tilt = [(0.5 + x * 0.44) * canvas.width, (0.5 + y * 0.44) * canvas.height];
    pointerGoal = 1;
  };

  /** Bound on the first touch, because iOS only grants access from a gesture. */
  const bindOrientation = () => {
    if (orientationBound || disposed) return;
    orientationBound = true;
    void requestOrientationAccess().then((granted) => {
      if (granted && !disposed) {
        window.addEventListener("deviceorientation", onOrientation);
      }
    });
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

    // Tilt eases in rather than snapping: raw orientation is noisy enough that
    // following it directly makes the light jitter.
    if (tilt) {
      const ease = 1 - Math.exp(-dt * 2.6);
      pointer = [
        pointer[0] + (tilt[0] - pointer[0]) * ease,
        pointer[1] + (tilt[1] - pointer[1]) * ease,
      ];
    }

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

    await loadFace(face);
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
      shaders: { background, rim, blur, composite },
      output,
      canvas: (w, h) => {
        const surface = document.createElement("canvas");
        surface.width = w;
        surface.height = h;
        return surface as never;
      },
      preset: variant.preset,
      face,
      gridSeed,
    });
    applySize();

    if (!reduced) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.documentElement.addEventListener("mouseleave", onLeave);
      if (touchPrimary) {
        window.addEventListener("touchstart", bindOrientation, { passive: true, once: true });
        // Where no permission gate exists the events flow immediately.
        void requestOrientationAccess().then((granted) => {
          if (granted && !disposed && !orientationBound) {
            orientationBound = true;
            window.addEventListener("deviceorientation", onOrientation);
          }
        });
      }
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
    async setFace(next) {
      await loadFace(next);
      if (!disposed) pipeline?.setFace(next);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchstart", bindOrientation);
      window.removeEventListener("deviceorientation", onOrientation);
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
