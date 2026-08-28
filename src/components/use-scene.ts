"use client";

import { useEffect } from "react";
import type { SceneName } from "@/gpu/types";
import { useField } from "./field-context";

/** Declares which state the field should ease toward for the current route. */
export function useScene(name: SceneName, focusSlug?: string | null) {
  const { request } = useField();
  useEffect(() => {
    request({ name, focusSlug: focusSlug ?? null });
  }, [request, name, focusSlug]);
}
