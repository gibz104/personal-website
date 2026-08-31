"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createHeroEngine, type HeroEngine } from "@/gpu/hero/engine";
import { MARK_FACES, type MarkFace } from "@/gpu/mark/faces";

/**
 * Compares display faces for the monogram in the live scene.
 *
 * Swapping redraws one texture rather than reloading, so the two candidates can
 * be flicked between while the flare keeps running — which is the only way to
 * judge a face here, since what matters is how its contour holds the light.
 */
export function TypeLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<HeroEngine | null>(null);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createHeroEngine(canvas, "flare", MARK_FACES[0]!.id);
    engineRef.current = engine;
    let cancelled = false;
    void engine.ready.then((ok) => {
      if (!cancelled && !ok) setFailed(true);
    });
    return () => {
      cancelled = true;
      engineRef.current = null;
      engine.dispose();
    };
  }, []);

  const choose = useCallback((index: number) => {
    const next = ((index % MARK_FACES.length) + MARK_FACES.length) % MARK_FACES.length;
    setActive(next);
    void engineRef.current?.setFace(MARK_FACES[next]!);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") choose(active + 1);
      else if (event.key === "ArrowLeft") choose(active - 1);
      else if (/^[1-9]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        if (index < MARK_FACES.length) choose(index);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, choose]);

  const face: MarkFace = MARK_FACES[active]!;

  return (
    <div className="relative min-h-svh overflow-hidden bg-ink">
      <canvas ref={canvasRef} aria-hidden className="fixed inset-0 z-0 block h-full w-full" />

      {failed ? (
        <p className="fixed inset-x-0 top-1/2 z-10 text-center text-sm text-muted">
          This browser does not support WebGPU.
        </p>
      ) : null}

      <div className="pointer-events-none relative z-10 flex min-h-svh flex-col justify-between p-6 sm:p-8">
        <p className="over-field tag">
          Monogram faces · arrows or 1–{MARK_FACES.length} to switch
        </p>

        <div className="over-field">
          <p className="max-w-lg text-[0.9375rem] leading-relaxed text-muted">
            {face.note}
          </p>

          <ul className="pointer-events-auto mt-5 flex flex-wrap gap-2">
            {MARK_FACES.map((option, index) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => choose(index)}
                  aria-pressed={index === active}
                  className={`rounded-full border px-3.5 py-1.5 font-mono text-[0.6875rem] tracking-[0.1em] transition-colors ${
                    index === active
                      ? "border-white/35 bg-white/[0.10] text-text"
                      : "border-line text-dim hover:border-line-strong hover:text-muted"
                  }`}
                >
                  {index + 1}. {option.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
