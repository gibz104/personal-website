"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createHeroEngine, type HeroEngine } from "@/gpu/hero/engine";

/** How the scene should behave behind the route that is mounted. */
export type SceneMood = {
  /** How present the scene should be, 0..1. */
  presence: number;
  /** Whether the light follows the pointer and the phone's tilt. */
  interactive: boolean;
};

type SceneControl = {
  status: "pending" | "running" | "unsupported";
  setMood(mood: SceneMood): void;
};

const SceneContext = createContext<SceneControl>({
  status: "pending",
  setMood: () => {},
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
  const pendingRef = useRef<SceneMood>({ presence: 1, interactive: true });
  const [status, setStatus] = useState<SceneControl["status"]>("pending");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createHeroEngine(canvas, "flare");
    engineRef.current = engine;
    // Apply whatever the first route asked for before the GPU finished booting.
    engine.setPresence(pendingRef.current.presence);
    engine.setInteractive(pendingRef.current.interactive);

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
      setMood(next) {
        pendingRef.current = next;
        engineRef.current?.setPresence(next.presence);
        engineRef.current?.setInteractive(next.interactive);
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

/** Declares how the scene should behave for the current route. */
export function useSceneMood(presence: number, interactive: boolean) {
  const { setMood } = useScene();
  useEffect(() => {
    setMood({ presence, interactive });
  }, [setMood, presence, interactive]);
}
