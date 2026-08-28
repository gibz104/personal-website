import type { Gpu, Surface } from "vgpu";
import { layoutAttractors } from "./layout";
import { createFieldPipeline, type FieldPipeline, type Quality } from "./pipeline";
import { easeScene, SCENES, viewCenter } from "./scenes";
import { SHADERS } from "./shaders";
import type { Attractor, SceneName, SceneParams } from "./types";
import type { Project } from "@/lib/projects";

export type SceneRequest = {
  name: SceneName;
  /** Slug to centre and emphasise, for the focus scene. */
  focusSlug?: string | null;
};

export type ScreenPoint = { x: number; y: number };

export type FieldEngine = {
  readonly ready: Promise<boolean>;
  readonly attractors: Attractor[];
  setScene(request: SceneRequest): void;
  setHover(slug: string | null): void;
  /** World → CSS pixels, for positioning HTML over the bodies. */
  project(x: number, y: number): ScreenPoint;
  /** Current CSS size of the canvas. */
  size(): { width: number; height: number };
  dispose(): void;
};

function pickQuality(): Quality {
  if (typeof navigator === "undefined") return "medium";
  const cores = navigator.hardwareConcurrency ?? 4;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const wide = window.innerWidth >= 1280;
  if (coarse || cores <= 4) return "low";
  if (cores >= 8 && wide) return "high";
  return "medium";
}

/** How long the field runs before a reduced-motion viewer's frame is frozen. */
const SETTLE_SECONDS = 6;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function isWebGPUAvailable(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

export function createFieldEngine(
  canvas: HTMLCanvasElement,
  projects: Project[],
): FieldEngine {
  const attractors = layoutAttractors(projects);
  const reduced = prefersReducedMotion();

  let disposed = false;
  let gpu: Gpu | undefined;
  let output: Surface | undefined;
  let pipeline: FieldPipeline | undefined;
  let raf = 0;
  let observer: ResizeObserver | undefined;

  let css = { width: 1, height: 1 };
  let scene: SceneParams = { ...SCENES.field };
  let goal: SceneParams = { ...SCENES.field };

  // Pointer lives in world space, parked far outside the field when absent so
  // the shader's radius test simply misses.
  const PARKED: [number, number] = [1e4, 1e4];
  let pointer: [number, number] = [...PARKED];
  let pointerForce = 0;
  let pointerGoal = 0;
  let dragging = false;

  let hoverIndex = -1;
  let hoverAmount = 0;
  let fade = 0;
  let last = 0;
  let elapsed = 0;

  const indexOf = (slug: string | null) =>
    slug ? attractors.findIndex((a) => a.slug === slug) : -1;

  function measure() {
    const rect = canvas.getBoundingClientRect();
    css = {
      width: Math.max(1, Math.round(rect.width)),
      height: Math.max(1, Math.round(rect.height)),
    };
  }

  /**
   * The surface owns the canvas backing store, so it has to be resized too —
   * resizing only the offscreen targets leaves the composite rendering at the
   * canvas's default 300x150 and being upscaled by the browser.
   */
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

  function project(x: number, y: number): ScreenPoint {
    const aspect = css.width / Math.max(1, css.height);
    const [viewX, viewY] = viewCenter(scene, aspect);
    const ndcX = (x - viewX) / (scene.zoom * aspect);
    const ndcY = (y - viewY) / scene.zoom;
    return {
      x: ((ndcX + 1) / 2) * css.width,
      y: ((1 - ndcY) / 2) * css.height,
    };
  }

  function toWorld(clientX: number, clientY: number): [number, number] {
    const rect = canvas.getBoundingClientRect();
    const aspect = rect.width / Math.max(1, rect.height);
    const ndcX = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    const ndcY = 1 - ((clientY - rect.top) / Math.max(1, rect.height)) * 2;
    const [viewX, viewY] = viewCenter(scene, aspect);
    return [viewX + ndcX * scene.zoom * aspect, viewY + ndcY * scene.zoom];
  }

  // Listening on the window rather than the canvas is deliberate: the canvas is
  // behind the whole page, so canvas-scoped listeners would only fire in the
  // gaps between content and the field would be un-stirrable where it matters.
  const onPointerMove = (event: PointerEvent) => {
    pointer = toWorld(event.clientX, event.clientY);
    pointerGoal = dragging ? 2.1 : 1;
  };
  const onPointerLeave = () => {
    pointerGoal = 0;
  };
  const onPointerDown = (event: PointerEvent) => {
    dragging = true;
    pointer = toWorld(event.clientX, event.clientY);
    pointerGoal = 2.1;
  };
  const onPointerUp = () => {
    dragging = false;
    pointerGoal = pointerGoal > 0 ? 1 : 0;
  };

  function setScene(request: SceneRequest) {
    const base = SCENES[request.name];
    const index = indexOf(request.focusSlug ?? null);
    const focus = index >= 0 ? attractors[index]! : undefined;
    goal = {
      ...base,
      focusIndex: index,
      centerX: focus ? focus.x : base.centerX,
      centerY: focus ? focus.y : base.centerY,
      focusAmount: focus ? base.focusAmount : 0,
    };
  }

  function setHover(slug: string | null) {
    hoverIndex = indexOf(slug);
  }

  function tick(now: number) {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    if (!pipeline || !output) return;

    const dt = last === 0 ? 1 / 60 : Math.min((now - last) / 1000, 1 / 20);
    last = now;
    elapsed += dt;

    scene = easeScene(scene, goal, dt, 2.4);
    fade = Math.min(1, fade + dt * 0.9);
    pointerForce += (pointerGoal - pointerForce) * (1 - Math.exp(-dt * 5));
    hoverAmount += ((hoverIndex >= 0 ? 1 : 0) - hoverAmount) * (1 - Math.exp(-dt * 8));

    // Reduced motion: let the field settle into an image, then hold that frame
    // for good. The artwork still arrives; the animation does not.
    if (reduced && elapsed > SETTLE_SECONDS) return;

    pipeline.render({
      time: elapsed,
      dt,
      pointer: pointerForce > 0.002 ? pointer : PARKED,
      pointerForce: pointerForce * 1.15,
      scene,
      hoverIndex,
      hoverAmount,
      fade,
      decay: 0.86,
    });
  }

  async function start(): Promise<boolean> {
    if (!isWebGPUAvailable()) return false;
    const { init, surface } = await import("vgpu");
    if (disposed) return false;

    gpu = await init({ label: "field" });
    if (disposed) {
      gpu.dispose();
      return false;
    }

    measure();
    output = surface(gpu, canvas, {
      autoResize: false,
      alphaMode: "opaque",
      dpr: [1, 2],
    });

    pipeline = createFieldPipeline({
      gpu,
      api: await import("vgpu"),
      shaders: SHADERS,
      output,
      attractors,
      quality: reduced ? "low" : pickQuality(),
    });
    applySize();

    // Stirring is motion, so reduced-motion viewers do not get the listeners.
    if (!reduced) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerdown", onPointerDown, { passive: true });
      window.addEventListener("pointerup", onPointerUp, { passive: true });
      window.addEventListener("pointercancel", onPointerUp, { passive: true });
      window.addEventListener("blur", onPointerLeave);
      document.documentElement.addEventListener("mouseleave", onPointerLeave);
    }

    observer = new ResizeObserver(applySize);
    observer.observe(canvas);

    raf = requestAnimationFrame(tick);
    return true;
  }

  const ready = start().catch((error: unknown) => {
    console.error("[field] initialisation failed", error);
    return false;
  });

  return {
    ready,
    attractors,
    setScene,
    setHover,
    project,
    size: () => css,
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("blur", onPointerLeave);
      document.documentElement.removeEventListener("mouseleave", onPointerLeave);
      try {
        gpu?.dispose();
      } catch {
        // Teardown races with an in-flight init; nothing useful to do.
      }
    },
  };
}
