"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createHeroEngine, type HeroEngine } from "@/gpu/hero/engine";

type SceneControl = {
  status: "pending" | "running" | "unsupported";
  /** How present the scene should be behind the current route, 0..1. */
  setPresence(value: number): void;
};

const SceneContext = createContext<SceneControl>({
  status: "pending",
  setPresence: () => {},
});

export function useScene(): SceneControl {
  return useContext(SceneContext);
}

/**
 * Owns the one canvas that lives for the whole session.
 *
 * Routes do not tear it down and rebuild it — they turn its presence up or
 * down. Navigating therefore reads as the light dimming while you read, and
 * coming back up when you return, rather than as a page swap.
 */
export function SceneProvider({ children }: { children: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<HeroEngine | null>(null);
  const pendingRef = useRef(1);
  const [status, setStatus] = useState<SceneControl["status"]>("pending");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createHeroEngine(canvas, "flare");
    engineRef.current = engine;
    // Apply whatever the first route asked for before the GPU finished booting.
    engine.setPresence(pendingRef.current);

    let cancelled = false;
    void engine.ready.then((ok) => {
      if (!cancelled) setStatus(ok ? "running" : "unsupported");
    });

    return () => {
      cancelled = true;
      engineRef.current = null;
      engine.dispose();
    };
  }, []);

  const value = useMemo<SceneControl>(
    () => ({
      status,
      setPresence(next) {
        pendingRef.current = next;
        engineRef.current?.setPresence(next);
      },
    }),
    [status],
  );

  return (
    <SceneContext.Provider value={value}>
      <canvas ref={canvasRef} aria-hidden className="fixed inset-0 z-0 block h-full w-full" />
      {children}
    </SceneContext.Provider>
  );
}

/** Declares how present the scene should be for the current route. */
export function usePresence(value: number) {
  const { setPresence } = useScene();
  useEffect(() => {
    setPresence(value);
  }, [setPresence, value]);
}
