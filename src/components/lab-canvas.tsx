"use client";

import { useEffect, useRef, useState } from "react";
import { createLabEngine } from "@/gpu/lab/engine";
import type { ConceptId } from "@/gpu/lab/shaders";

/** Mounts one concept shader on a full-bleed canvas. */
export function LabCanvas({ concept }: { concept: ConceptId }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createLabEngine(canvas, concept);
    let cancelled = false;
    void engine.ready.then((ok) => {
      if (!cancelled && !ok) setFailed(true);
    });
    return () => {
      cancelled = true;
      engine.dispose();
    };
  }, [concept]);

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
