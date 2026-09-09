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
  /** How present the scene should be, 0..1. Eased, never snapped. */
  setPresence(value: number): void;
  /**
   * Whether the light follows the pointer and the phone's tilt.
   *
   * Turned off behind a page of prose. The light chasing the cursor is the
   * point on the home page and a distraction anywhere someone is reading:
   * every scroll drags the glow across the words. Off, the source keeps its
   * own slow drift, so the scene is still alive — it just stops answering.
   */
  setInteractive(value: boolean): void;
  dispose(): void;
};

/** How long the scene runs before a reduced-motion viewer's frame is frozen. */
const SETTLE_SECONDS = 6;

/**
 * The ratio the surface is drawn at, capped at 2.
 *
 * Above 2 the extra pixels cost real frame time and buy nothing anyone can
 * see. The cap has to match the surface's own `dpr: [1, 2]`, or the board
 * would size its cells for a ratio the surface never renders at.
 */
function currentDpr(): number {
  return Math.min(window.devicePixelRatio || 1, 2);
}

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
  let sizeRaf = 0;
  let observer: ResizeObserver | undefined;
  let densityQuery: MediaQueryList | undefined;

  let css = { width: 1, height: 1 };
  let appliedDpr = 0;
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
  let interactive = true;
  let presence = 1;
  let presenceGoal = 1;
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
    const dpr = currentDpr();
    const width = Math.max(1, Math.round(css.width * dpr));
    const height = Math.max(1, Math.round(css.height * dpr));
    // The ratio is part of the condition: browser zoom can halve the CSS box
    // and double the ratio in one step, leaving the backing size identical.
    // Comparing pixels alone, the board would keep cells sized for the old
    // ratio and the page would render at half the intended size.
    if (output.size[0] === width && output.size[1] === height && appliedDpr === dpr) {
      return;
    }
    appliedDpr = dpr;
    output.resize([width, height]);
    pipeline.resize(output.size[0], output.size[1], dpr);
  }

  /**
   * Coalesces a burst of resize events into one apply per frame.
   *
   * A ResizeObserver fires for every step of a window drag, and each apply
   * re-rasterises the mark and uploads a texture the size of the viewport.
   * Doing that dozens of times a second is what makes a drag stutter, and it
   * is enough canvas allocation to run a browser out of the memory it will
   * hand to 2D contexts. One apply per frame is all a drag can show anyway.
   */
  function scheduleSize() {
    if (disposed || sizeRaf) return;
    sizeRaf = requestAnimationFrame(() => {
      sizeRaf = 0;
      applySize();
    });
  }

  /**
   * Re-applies when the pixel ratio changes on its own.
   *
   * A ResizeObserver only sees the CSS box, and the ratio can change without
   * it moving: drag a window from a retina display to an external monitor and
   * the box is identical while every pixel behind it just halved. Nothing
   * would call applySize, so the scene would keep drawing at the old density
   * until something else happened to resize it. matchMedia is the only event
   * for this, and the query has to be rebuilt each time because it can only
   * ask about one exact ratio.
   */
  const onDensityChange = () => {
    scheduleSize();
    watchDensity();
  };

  function watchDensity() {
    densityQuery?.removeEventListener("change", onDensityChange);
    densityQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    densityQuery.addEventListener("change", onDensityChange);
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!interactive) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = currentDpr();
    pointer = [(event.clientX - rect.left) * dpr, (event.clientY - rect.top) * dpr];
    pointerGoal = 1;
    // A real touch outranks the gyroscope for as long as it lasts.
    tilt = undefined;
  };
  const onLeave = () => {
    pointerGoal = 0;
  };

  const onOrientation = (event: DeviceOrientationEvent) => {
    if (!interactive) return;
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
    presence += (presenceGoal - presence) * (1 - Math.exp(-dt * 3.2));
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

    pipeline.render({ time: elapsed, dt, pointer, pointerActive, intro, presence });
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
      dpr: currentDpr(),
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

    observer = new ResizeObserver(scheduleSize);
    observer.observe(canvas);
    watchDensity();
    raf = requestAnimationFrame(tick);
    return true;
  }

  const ready = start().catch((error: unknown) => {
    console.error(`[hero:${variant.id}] initialisation failed`, error);
    return false;
  });

  return {
    ready,
    setPresence(value) {
      presenceGoal = Math.max(0, Math.min(1, value));
    },
    setInteractive(value) {
      interactive = value;
      if (value) return;
      // Hand the light back to its drift rather than leaving it parked
      // wherever the cursor happened to be when the route changed. The ease on
      // pointerActive carries it there over about a fifth of a second, so the
      // page arrives without a jump.
      pointerGoal = 0;
      tilt = undefined;
    },
    async setFace(next) {
      await loadFace(next);
      if (!disposed) pipeline?.setFace(next);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(sizeRaf);
      observer?.disconnect();
      densityQuery?.removeEventListener("change", onDensityChange);
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
