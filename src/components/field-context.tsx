"use client";

import { createContext, useContext } from "react";
import type { FieldEngine, SceneRequest } from "@/gpu/engine";

export type FieldControl = {
  /** Null until WebGPU is up; components must tolerate its absence. */
  engine: FieldEngine | null;
  status: "pending" | "running" | "unsupported";
  request(scene: SceneRequest): void;
  hover(slug: string | null): void;
};

export const FieldContext = createContext<FieldControl>({
  engine: null,
  status: "pending",
  request: () => {},
  hover: () => {},
});

export function useField(): FieldControl {
  return useContext(FieldContext);
}
