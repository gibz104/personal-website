"use client";

import { useEffect, useRef, useState } from "react";
import { createHeroEngine } from "@/gpu/hero/engine";

/** Mounts one hero variant on a full-bleed canvas. */
export function HeroCanvas({ variant }: { variant: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createHeroEngine(canvas, variant);
    let cancelled = false;
    void engine.ready.then((ok) => {
      if (!cancelled && !ok) setFailed(true);
    });
    return () => {
      cancelled = true;
      engine.dispose();
    };
  }, [variant]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="fixed inset-0 z-0 block h-full w-full"
      />
      {failed ? (
        <p className="fixed inset-x-0 top-1/2 z-10 text-center text-sm text-muted">
          This browser does not support WebGPU.
        </p>
      ) : null}
    </>
  );
}
