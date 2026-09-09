"use client";

import { useState } from "react";
import { ScrambleText } from "./scramble-text";
import { languageColor } from "@/lib/language-color";
import { CATEGORY_LABEL, type ListedProject } from "@/lib/projects";

/** North-east arrow. Marks the links that leave the site. */
function OutwardArrow() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-2.5 shrink-0 opacity-70"
    >
      <path d="M3.2 8.8 8.8 3.2M4.4 3.2h4.4v4.4" />
    </svg>
  );
}

/**
 * The work, as a list.
 *
 * Minimal on purpose — the page already has a light show behind it, and a grid
 * of cards would compete with it. What keeps it from being a plain table is
 * that each title lands the way the board does when the row is reached, so the
 * list shares a gesture with the artwork instead of ignoring it.
 *
 * The row is no longer one large link. Several of these projects live in more
 * than one place, a package registry or a library directory or the running
 * thing itself, and a link cannot be nested inside a link. So the row is a
 * plain container: the title goes to the source, and anywhere else the project
 * lives gets its own control underneath.
 */
export function ProjectList({ projects }: { projects: ListedProject[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <ul className="border-t border-line">
      {projects.map((project, index) => {
        const accent = languageColor(project.language);
        const active = hovered === project.id;

        return (
          <li key={project.id}>
            <div
              onMouseEnter={() => setHovered(project.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(project.id)}
              onBlur={() => setHovered(null)}
              className="group relative flex flex-col gap-x-8 gap-y-3 border-b border-line py-6 transition-colors duration-300 hover:bg-white/[0.02] focus-within:bg-white/[0.03] sm:flex-row sm:items-baseline sm:py-7"
            >
              {/* Draws across the row from the left, in the project's language. */}
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-[-1px] h-px w-0 transition-[width] duration-700 ease-out group-hover:w-full group-focus-within:w-full"
                style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
              />

              <span className="tag w-8 shrink-0 tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="min-w-0 flex-1">
                <a
                  href={project.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/40"
                >
                  <ScrambleText
                    text={project.title}
                    active={active}
                    className="block font-mono text-xl font-medium tracking-tight text-text sm:text-2xl"
                  />
                </a>

                <p className="mt-1.5 max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
                  {project.tagline}
                </p>

                {project.links.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {project.links.map((link) => (
                      <li key={link.href}>
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          // Read out of a link list these labels lose their
                          // row, and two of them name the same host, so the
                          // project travels with the label.
                          aria-label={`${link.label}, ${project.title}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 font-mono text-[0.6875rem] tracking-[0.12em] uppercase text-dim transition-colors hover:border-line-strong hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
                        >
                          {link.label}
                          <OutwardArrow />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-5 sm:flex-col sm:items-end sm:gap-1.5">
                <span
                  className="font-mono text-[0.6875rem] tracking-[0.14em] uppercase"
                  style={{ color: accent }}
                >
                  {/* Nothing without a repository has a language, so it says
                      what the project is instead of leaving a dash. */}
                  {project.language ?? CATEGORY_LABEL[project.category]}
                </span>
                {project.stars !== null && project.stars > 0 && (
                  <span className="tag tabular-nums">{project.stars}★</span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
