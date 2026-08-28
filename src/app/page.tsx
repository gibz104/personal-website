import Link from "next/link";
import { ProjectRow } from "@/components/project-row";
import { Scene } from "@/components/scene";
import { SiteFooter } from "@/components/site-footer";
import { PROFILE } from "@/content/profile";
import { FEATURED, PROJECTS, TOTAL_STARS } from "@/lib/projects";

export default function HomePage() {
  return (
    <>
      <Scene name="field" />

      <section className="relative flex min-h-svh items-center justify-center px-6">
        {/* Radial scrim: keeps the type readable without flattening the field
            behind it into a grey rectangle. */}
        <div aria-hidden className="scrim pointer-events-none absolute inset-0" />

        <div className="over-field relative max-w-3xl text-center">
          <p className="tag rise" style={{ animationDelay: "80ms" }}>
            {PROFILE.location} · Systems &amp; data
          </p>

          <h1
            className="rise mt-6 text-[clamp(2.75rem,9vw,7rem)] font-medium leading-[0.92] tracking-[-0.035em]"
            style={{ animationDelay: "160ms" }}
          >
            {PROFILE.name}
          </h1>

          <p
            className="rise mx-auto mt-7 max-w-xl text-balance text-[1.0625rem] leading-relaxed text-muted sm:text-lg"
            style={{ animationDelay: "260ms" }}
          >
            {PROFILE.tagline}
          </p>

          <div
            className="rise mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
            style={{ animationDelay: "360ms" }}
          >
            <Link
              href="/work"
              className="rounded-full border border-line-strong px-6 py-2.5 text-sm transition-colors hover:border-white/30 hover:bg-white/[0.04]"
            >
              Explore the field
            </Link>
            <p className="tag tabular-nums">
              {PROJECTS.length} projects · {TOTAL_STARS} stars
            </p>
          </div>
        </div>

        <p
          className="tag rise absolute bottom-8 left-1/2 -translate-x-1/2"
          style={{ animationDelay: "700ms" }}
        >
          Drag to stir
        </p>
      </section>

      <section className="relative bg-ink/88 backdrop-blur-[2px]">
        <div className="mx-auto max-w-[104rem] px-6 py-24 sm:px-10 sm:py-32">
          <div className="mb-14 flex items-baseline justify-between gap-6">
            <h2 className="text-sm font-medium tracking-tight">Selected work</h2>
            <Link href="/work" className="tag transition-colors hover:text-muted">
              All {PROJECTS.length} →
            </Link>
          </div>

          <div className="border-b border-line">
            {FEATURED.map((project, i) => (
              <ProjectRow key={project.slug} project={project} index={i} />
            ))}
          </div>
        </div>

        <SiteFooter />
      </section>
    </>
  );
}
