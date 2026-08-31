"use client";

import { useState } from "react";
import { ScrambleText } from "./scramble-text";
import { languageColor } from "@/lib/language-color";
import type { Project } from "@/lib/projects";

/**
 * The work, as a list.
 *
 * Minimal on purpose — the page already has a light show behind it, and a grid
 * of cards would compete with it. What keeps it from being a plain table is
 * that each title lands the way the board does when the row is reached, so the
 * list shares a gesture with the artwork instead of ignoring it.
 */
export function ProjectList({ projects }: { projects: Project[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <ul className="border-t border-line">
      {projects.map((project, index) => {
        const accent = languageColor(project.language);
        const active = hovered === project.slug;

        return (
          <li key={project.slug}>
            <a
              href={project.url}
              target="_blank"
              rel="noreferrer"
              onMouseEnter={() => setHovered(project.slug)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(project.slug)}
              onBlur={() => setHovered(null)}
              className="group relative flex flex-col gap-2 border-b border-line py-6 transition-colors duration-300 hover:bg-white/[0.02] focus-visible:bg-white/[0.03] focus-visible:outline-none sm:flex-row sm:items-baseline sm:gap-8 sm:py-7"
            >
              {/* Draws across the row from the left, in the project's language. */}
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-[-1px] h-px w-0 transition-[width] duration-700 ease-out group-hover:w-full group-focus-visible:w-full"
                style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
              />

              <span className="tag w-8 shrink-0 tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>

              <span className="min-w-0 flex-1">
                <ScrambleText
                  text={project.title}
                  active={active}
                  className="block font-mono text-xl font-medium tracking-tight text-text sm:text-2xl"
                />
                <span className="mt-1.5 block max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
                  {project.tagline}
                </span>
              </span>

              <span className="flex shrink-0 items-center gap-5 sm:flex-col sm:items-end sm:gap-1.5">
                <span
                  className="font-mono text-[0.6875rem] tracking-[0.14em] uppercase"
                  style={{ color: accent }}
                >
                  {project.language ?? "—"}
                </span>
                <span className="tag tabular-nums">
                  {project.stars > 0 ? `${project.stars}★` : "—"}
                </span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
