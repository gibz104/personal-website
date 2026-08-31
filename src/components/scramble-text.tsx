"use client";

import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789<>[]{}()/\\*+-=#$&%@!?;:";

/**
 * Text that lands the way the board does: characters flicker, then stop one at
 * a time from the left.
 *
 * The hero's board is a shader; this is the same idea in the DOM, so the list
 * and the artwork share a gesture without the list having to live on the GPU.
 * Characters land on a fixed cadence rather than a duration, so a long title
 * takes longer than a short one — which is what makes it read as mechanical.
 */
export function ScrambleText({
  text,
  active,
  className,
  /** Seconds between one character landing and the next. */
  cadence = 0.028,
}: {
  text: string;
  active: boolean;
  className?: string;
  cadence?: number;
}) {
  const [shown, setShown] = useState(text);
  const frame = useRef(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  }, []);

  useEffect(() => {
    if (!active || reduced.current) {
      setShown(text);
      return;
    }

    const started = performance.now();
    const run = () => {
      const elapsed = (performance.now() - started) / 1000;
      const landed = Math.floor(elapsed / cadence);
      if (landed >= text.length) {
        setShown(text);
        return;
      }
      let next = text.slice(0, landed);
      for (let i = landed; i < text.length; i++) {
        // Spaces stay put: scrambling them makes a title lose its word shape,
        // which is the one cue that says how long the answer is going to be.
        next += text[i] === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      setShown(next);
      frame.current = requestAnimationFrame(run);
    };
    frame.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame.current);
  }, [text, active, cadence]);

  // The real text stays in the accessibility tree; only the visible glyphs churn.
  return (
    <span className={className}>
      <span aria-hidden>{shown}</span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
