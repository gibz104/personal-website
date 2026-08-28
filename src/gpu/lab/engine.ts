import type { Gpu, Surface } from "vgpu";
import { createLabPipeline, type LabPipeline } from "./pipeline";
import { CONCEPT_SHADERS, LAB_SHARED, type ConceptId } from "./shaders";
import { conceptById } from "./concepts";
import { isWebGPUAvailable, prefersReducedMotion } from "../engine";

export type LabEngine = {
  readonly ready: Promise<boolean>;
  dispose(): void;
};

/** Drives one concept shader on one canvas. */
export function createLabEngine(
  canvas: HTMLCanvasElement,
  concept: ConceptId,
): LabEngine {
  const reduced = prefersReducedMotion();

  let disposed = false;
  let gpu: Gpu | undefined;
  let output: Surface | undefined;
  let pipeline: LabPipeline | undefined;
  let raf = 0;
  let observer: ResizeObserver | undefined;

  let css = { width: 1, height: 1 };
  let pointer: [number, number] = [0, 0];
  let pointerActive = 0;
  let pointerGoal = 0;
  // Starts large so the click wave is off screen until someone actually clicks.
  let clickAge = 999;
  let click: [number, number] = [-9999, -9999];
  let previousPointer: [number, number] = [0, 0];
  let speed = 0;
  let dwell = 0;
  let pinnedRow = -1;
  let intro = 0;
  let elapsed = 0;
  let last = 0;

  // Matches CELL in the shaders: rows are 20 backing pixels tall.
  const CELL_HEIGHT = 20;

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
    // The shader works in backing pixels, which is what the surface is sized in.
    pointer = [(event.clientX - rect.left) * dpr, (event.clientY - rect.top) * dpr];
    pointerGoal = 1;
  };
  const onLeave = () => {
    pointerGoal = 0;
  };
  const onPointerDown = (event: PointerEvent) => {
    onPointerMove(event);
    clickAge = 0;
    click = [...pointer];
    // Focus pins the row that was clicked; the others ignore it.
    pinnedRow = Math.floor(pointer[1] / CELL_HEIGHT);
  };

  function tick(now: number) {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    if (!pipeline) return;

    const dt = last === 0 ? 1 / 60 : Math.min((now - last) / 1000, 1 / 20);
    last = now;
    elapsed += dt;
    clickAge += dt;
    intro = Math.min(1, intro + dt * 0.7);
    pointerActive += (pointerGoal - pointerActive) * (1 - Math.exp(-dt * 6));

    // Speed drives the brush width; dwell rewards holding still.
    const moved = Math.hypot(pointer[0] - previousPointer[0], pointer[1] - previousPointer[1]);
    speed += (moved / Math.max(dt, 1e-4) - speed) * (1 - Math.exp(-dt * 8));
    dwell = Math.max(0, Math.min(1, dwell + (moved < 1.5 ? dt * 0.75 : -dt * 3.2)));

    // Reduced motion: compose a frame, then hold it.
    if (reduced && elapsed > 5) return;

    pipeline.render({
      time: elapsed,
      pointer,
      previousPointer,
      click,
      pointerActive,
      clickAge,
      dwell,
      speed,
      pinnedRow,
      intro,
    });

    previousPointer = [...pointer];
  }

  async function start(): Promise<boolean> {
    if (!isWebGPUAvailable()) return false;
    const api = await import("vgpu");
    if (disposed) return false;

    gpu = await api.init({ label: `lab-${concept}` });
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

    pipeline = createLabPipeline({
      gpu,
      api,
      scene: CONCEPT_SHADERS[concept],
      shaders: LAB_SHARED,
      tuning: conceptById(concept)!.tuning,
      output,
    });
    applySize();

    if (!reduced) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerdown", onPointerDown, { passive: true });
      document.documentElement.addEventListener("mouseleave", onLeave);
    }

    observer = new ResizeObserver(applySize);
    observer.observe(canvas);
    raf = requestAnimationFrame(tick);
    return true;
  }

  const ready = start().catch((error: unknown) => {
    console.error(`[lab:${concept}] initialisation failed`, error);
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
      window.removeEventListener("pointerdown", onPointerDown);
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
