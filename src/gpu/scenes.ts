import type { SceneParams, SceneName } from "./types";

/**
 * The field never reloads between routes — it eases between these states, so
 * navigating reads as the camera moving rather than a page swap.
 */
export const SCENES: Record<SceneName, SceneParams> = {
  // Home: close in, fast, particle-dominant. The field is the subject.
  field: {
    zoom: 1.00,
    centerX: 0,
    centerY: 0,
    panX: 0,
    panY: 0,
    flow: 0.34,
    gravity: 0.055,
    coupling: 4.2,
    exposure: 0.115,
    coreGlow: 0.80,
    bonding: 0,
    focusIndex: -1,
    focusAmount: 0,
  },

  // Work: pulled back so every project is on screen and legible, calmer flow
  // so the cores read as labelled nodes rather than weather.
  constellation: {
    zoom: 1.06,
    centerX: 0,
    centerY: 0,
    panX: 0,
    panY: 0,
    flow: 0.24,
    gravity: 0.070,
    coupling: 5.4,
    exposure: 0.095,
    coreGlow: 1.25,
    bonding: 0.4,
    focusIndex: -1,
    focusAmount: 0,
  },

  // Project detail: one body dominates, everything else falls back.
  focus: {
    zoom: 0.66,
    centerX: 0,
    centerY: 0,
    panX: -0.30,
    panY: 0,
    flow: 0.16,
    gravity: 0.060,
    coupling: 5.0,
    exposure: 0.042,
    coreGlow: 0.34,
    bonding: 0.7,
    focusIndex: -1,
    focusAmount: 1,
  },

  // About: slow drift, low energy — text is the subject here.
  calm: {
    zoom: 1.12,
    centerX: 0,
    centerY: 0,
    panX: -0.30,
    panY: 0,
    flow: 0.16,
    gravity: 0.040,
    coupling: 6.0,
    exposure: 0.038,
    coreGlow: 0.30,
    bonding: 0.2,
    focusIndex: -1,
    focusAmount: 0,
  },
};

const KEYS = [
  "zoom", "centerX", "centerY", "panX", "panY", "flow", "gravity", "coupling",
  "exposure", "coreGlow", "bonding", "focusIndex", "focusAmount",
] as const satisfies readonly (keyof SceneParams)[];

/**
 * The point the camera is actually looking at, once pan is applied.
 * Pipeline and engine must agree on this or the HTML labels drift off the
 * bodies they are labelling.
 */
export function viewCenter(
  scene: SceneParams,
  aspect: number,
): readonly [number, number] {
  // Narrow viewports have no room to pan into; collapse it rather than pushing
  // the subject off screen entirely.
  const room = Math.min(1, Math.max(0, (aspect - 0.95) / 0.6));
  return [
    scene.centerX + scene.panX * room * scene.zoom * aspect,
    scene.centerY + scene.panY * room * scene.zoom,
  ];
}

/** Frame-rate independent exponential ease toward a target scene. */
export function easeScene(
  current: SceneParams,
  goal: SceneParams,
  dt: number,
  rate = 2.6,
): SceneParams {
  const t = 1 - Math.exp(-rate * dt);
  const next = { ...current };
  for (const key of KEYS) {
    // focusIndex is an identifier, not a quantity — snapping avoids easing
    // through attractor 3 on the way from 1 to 7.
    next[key] = key === "focusIndex" ? goal[key] : current[key] + (goal[key] - current[key]) * t;
  }
  return next;
}
