"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createFieldEngine, type FieldEngine, type SceneRequest } from "@/gpu/engine";
import type { Project } from "@/lib/projects";
import { FieldContext, type FieldControl } from "./field-context";

/**
 * Owns the one canvas that lives for the whole session. Routes change the scene
 * it eases toward; nothing ever tears the GPU context down, which is what makes
 * navigation read as the camera moving rather than a page swapping.
 */
export function FieldProvider({
  projects,
  children,
}: {
  projects: Project[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const inLab = pathname.startsWith("/lab");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FieldEngine | null>(null);
  const pendingRef = useRef<SceneRequest | null>(null);
  const [status, setStatus] = useState<FieldControl["status"]>("pending");
  const [engine, setEngine] = useState<FieldEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || inLab) return;

    // No synchronous WebGPU branch here: the engine already resolves `ready`
    // to false when WebGPU is missing, and setting state synchronously inside
    // an effect cascades renders.
    const created = createFieldEngine(canvas, projects);
    engineRef.current = created;
    // Apply whatever the first route asked for before the GPU finished booting.
    if (pendingRef.current) created.setScene(pendingRef.current);

    let cancelled = false;
    void created.ready.then((ok) => {
      if (cancelled) return;
      setStatus(ok ? "running" : "unsupported");
      if (ok) setEngine(created);
    });

    return () => {
      cancelled = true;
      engineRef.current = null;
      setEngine(null);
      created.dispose();
    };
  }, [projects, inLab]);

  const value = useMemo<FieldControl>(
    () => ({
      engine,
      status,
      request(scene) {
        pendingRef.current = scene;
        engineRef.current?.setScene(scene);
      },
      hover(slug) {
        engineRef.current?.setHover(slug);
      },
    }),
    [engine, status],
  );

  return (
    <FieldContext.Provider value={value}>
      <canvas
        ref={canvasRef}
        hidden={inLab}
        className="field-canvas"
        aria-hidden
        // The field is decorative; every project it depicts is also a link in
        // the DOM, so nothing here is the only route to the content.
      />
      {status === "unsupported" && !inLab ? <StaticField /> : null}
      {children}
    </FieldContext.Provider>
  );
}

/**
 * Shown when WebGPU is unavailable. The poster is a real frame of the same
 * simulation, rendered headless at build time by scripts/preview.mts.
 */
function StaticField() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0 bg-ink bg-cover bg-center opacity-70"
      style={{ backgroundImage: "url(/field-poster.jpg)" }}
    />
  );
}
