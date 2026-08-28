"use client";

import type { SceneName } from "@/gpu/types";
import { useScene } from "./use-scene";

/** Declarative scene selection for server-rendered pages. Renders nothing. */
export function Scene({ name, focus }: { name: SceneName; focus?: string }) {
  useScene(name, focus ?? null);
  return null;
}
