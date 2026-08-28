import type { ShaderSource } from "@vgpu/wgsl";

/**
 * The pipeline never imports `.wgsl` itself. The browser passes sources through
 * the bundler loader; the headless preview resolves the same files from disk.
 * Both hand the pipeline this bundle, so what I look at offline is what ships.
 */
export type ShaderBundle = {
  readonly simulate: ShaderSource | string;
  readonly fade: ShaderSource | string;
  readonly particles: ShaderSource | string;
  readonly attractors: ShaderSource | string;
  readonly bright: ShaderSource | string;
  readonly blur: ShaderSource | string;
  readonly composite: ShaderSource | string;
};

export const SHADER_NAMES = [
  "simulate",
  "fade",
  "particles",
  "attractors",
  "bright",
  "blur",
  "composite",
] as const;

/** A project as it exists in the field: a body with mass, colour and a place. */
export type Attractor = {
  readonly slug: string;
  readonly label: string;
  /** World-space position. World is y in [-1, 1], x scaled by aspect. */
  readonly x: number;
  readonly y: number;
  /** Pull strength, derived from stars. */
  readonly mass: number;
  /** Core radius in world units. */
  readonly radius: number;
  readonly color: readonly [number, number, number];
  readonly featured: boolean;
};

/** Named camera/simulation states the field eases between as routes change. */
export type SceneName = "field" | "constellation" | "focus" | "calm";

export type SceneParams = {
  /** World units visible vertically. Lower = closer. */
  zoom: number;
  /** Centre of view in world space. */
  centerX: number;
  centerY: number;
  /**
   * Shifts the view off the centre point, as a fraction of the half-viewport.
   * Negative panX moves the subject right, which is how a focused body gets out
   * from behind the text column instead of sitting under it.
   */
  panX: number;
  panY: number;
  /** Curl-noise advection strength. */
  flow: number;
  /** Attractor pull. */
  gravity: number;
  /** How tightly particles are held to the flow streamlines, per second. */
  coupling: number;
  /** Particle brightness multiplier. */
  exposure: number;
  /** How strongly attractor cores render. */
  coreGlow: number;
  /** 0 = free field, 1 = fully collapsed onto attractors. */
  bonding: number;
  /** Index of the focused attractor, or -1. */
  focusIndex: number;
  /** How much the focused attractor dominates. */
  focusAmount: number;
};
