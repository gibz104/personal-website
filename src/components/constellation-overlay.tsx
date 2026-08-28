"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useField } from "./field-context";
import { languageCss } from "@/gpu/palette";
import type { Project } from "@/lib/projects";

type Anchor = {
  slug: string;
  x: number;
  y: number;
  /** Screen-space glow radius, so the label can clear it. */
  glow: number;
  /** Labels on the right half read inward, to stay inside the viewport. */
  side: "left" | "right";
  visible: boolean;
};

/**
 * Positions an HTML label over every GPU body, re-projected each frame.
 *
 * This is the join between the two halves of the site: the bodies are simulated
 * on the GPU and know nothing about the DOM, so the overlay asks the engine
 * where each one currently is and moves real, focusable links to match.
 */
export function ConstellationOverlay({ projects }: { projects: Project[] }) {
  const { engine, hover, status } = useField();
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const frame = useRef(0);

  useEffect(() => {
    if (!engine) return;
    let running = true;

    const update = () => {
      if (!running) return;
      frame.current = requestAnimationFrame(update);
      const { width, height } = engine.size();

      setAnchors(
        engine.attractors.map((a) => {
          const p = engine.project(a.x, a.y);
          // Measure the glow in screen space by projecting a second point:
          // the camera can zoom, so a fixed pixel offset would drift.
          const edge = engine.project(a.x + a.radius * 4.2, a.y);
          const side = p.x > width * 0.6 ? "left" : "right";
          return {
            slug: a.slug,
            x: p.x,
            y: p.y,
            glow: Math.max(14, Math.abs(edge.x - p.x)),
            side,
            visible:
              p.x > 40 && p.x < width - 40 && p.y > 84 && p.y < height - 40,
          };
        }),
      );
    };
    frame.current = requestAnimationFrame(update);

    return () => {
      running = false;
      cancelAnimationFrame(frame.current);
    };
  }, [engine]);

  if (status !== "running") return null;

  const bySlug = new Map(projects.map((p) => [p.slug, p]));

  return (
    <div className="pointer-events-none fixed inset-0 z-20 hidden md:block">
      {anchors.map((anchor) => {
        const project = bySlug.get(anchor.slug);
        if (!project || !anchor.visible) return null;
        const toLeft = anchor.side === "left";

        return (
          <Link
            key={anchor.slug}
            href={`/work/${project.slug}`}
            onMouseEnter={() => hover(project.slug)}
            onMouseLeave={() => hover(null)}
            onFocus={() => hover(project.slug)}
            onBlur={() => hover(null)}
            className={`over-field pointer-events-auto group absolute -translate-y-1/2 ${
              toLeft ? "-translate-x-full text-right" : "text-left"
            }`}
            style={{
              left: anchor.x + (toLeft ? -anchor.glow : anchor.glow),
              top: anchor.y,
            }}
          >
            <span className="block whitespace-nowrap text-[0.8125rem] font-medium tracking-tight text-text/75 transition-colors duration-200 group-hover:text-text group-focus-visible:text-text">
              {project.title}
            </span>
            <span
              className="mt-0.5 block whitespace-nowrap font-mono text-[0.625rem] tracking-[0.14em] uppercase opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
              style={{ color: languageCss(project.language) }}
            >
              {project.language ?? "—"}
              {project.stars > 0 ? ` · ${project.stars}★` : ""}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
