"use client";

import { usePresence } from "./scene-provider";

/** Declares how present the scene should be behind this route. Renders nothing. */
export function Presence({ value }: { value: number }) {
  usePresence(value);
  return null;
}
