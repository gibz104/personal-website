/** Capability checks shared by the renderer and the React layer. */

export function isWebGPUAvailable(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** True when there is no precise pointer — a phone or tablet. */
export function isTouchPrimary(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(hover: none) and (pointer: coarse)").matches ?? false;
}

type PermissionCapableOrientation = {
  requestPermission?: () => Promise<"granted" | "denied">;
};

/**
 * iOS gates device orientation behind a permission that can only be requested
 * from a user gesture, so this is called from the first touch rather than at
 * start-up. Everywhere else the events simply flow.
 */
export async function requestOrientationAccess(): Promise<boolean> {
  if (typeof DeviceOrientationEvent === "undefined") return false;
  const gate = DeviceOrientationEvent as unknown as PermissionCapableOrientation;
  if (typeof gate.requestPermission !== "function") return true;
  try {
    return (await gate.requestPermission()) === "granted";
  } catch {
    return false;
  }
}
