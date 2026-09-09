"use client";

import { useSceneMood } from "./scene-provider";

/**
 * Declares how the scene should behave behind this route. Renders nothing.
 *
 * `interactive` defaults to false because most routes are pages of prose, and
 * behind prose a light that chases the cursor fights the reader for attention.
 * The home page, where the scene is the content, opts back in.
 */
export function Presence({
  value,
  interactive = false,
}: {
  value: number;
  interactive?: boolean;
}) {
  useSceneMood(value, interactive);
  return null;
}
