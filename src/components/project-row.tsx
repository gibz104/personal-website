"use client";

import Link from "next/link";
import { useField } from "./field-context";
import { languageCss } from "@/gpu/palette";
import { CATEGORY_LABEL, type Project } from "@/lib/projects";

/**
 * A row that is also a handle on the artwork: hovering it lights the matching
 * body in the field, so the list and the simulation are visibly the same set.
 */
export function ProjectRow({ project, index }: { project: Project; index: number }) {
  const { hover } = useField();
  const accent = languageCss(project.language);

  return (
    <Link
      href={`/work/${project.slug}`}
      onMouseEnter={() => hover(project.slug)}
      onMouseLeave={() => hover(null)}
      onFocus={() => hover(project.slug)}
      onBlur={() => hover(null)}
      className="group relative block border-t border-line py-7 transition-colors duration-300 hover:bg-white/[0.02] focus-visible:bg-white/[0.03] focus-visible:outline-none sm:py-8"
    >
      {/* Accent bar that grows from the left edge on hover. */}
      <span
        aria-hidden
        className="absolute left-0 top-[-1px] h-px w-0 transition-all duration-500 ease-out group-hover:w-full group-focus-visible:w-full"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
      />

      <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-baseline sm:gap-8">
        <span className="tag w-8 shrink-0 tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="text-2xl font-medium tracking-tight text-text sm:text-[1.75rem]">
            {project.title}
          </h3>
          <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
            {project.tagline}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-5 sm:flex-col sm:items-end sm:gap-1.5">
          <span
            className="font-mono text-[0.6875rem] tracking-[0.14em] uppercase"
            style={{ color: accent }}
          >
            {project.language ?? CATEGORY_LABEL[project.category]}
          </span>
          <span className="tag tabular-nums">
            {project.stars > 0 ? `${project.stars}★` : CATEGORY_LABEL[project.category]}
          </span>
        </div>
      </div>
    </Link>
  );
}
