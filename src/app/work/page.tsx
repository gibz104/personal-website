import { ConstellationOverlay } from "@/components/constellation-overlay";
import { ProjectRow } from "@/components/project-row";
import { Scene } from "@/components/scene";
import { SiteFooter } from "@/components/site-footer";
import { CATEGORY_LABEL, PROJECTS, type Project } from "@/lib/projects";

export const metadata = { title: "Work" };

const ORDER: Project["category"][] = ["onchain", "hardware", "viz", "tools"];

export default function WorkPage() {
  const grouped = ORDER.map((category) => ({
    category,
    items: PROJECTS.filter((p) => p.category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <Scene name="constellation" />
      <ConstellationOverlay projects={PROJECTS} />

      {/* The constellation itself is the first screen: labels are positioned
          over the live GPU bodies by ConstellationOverlay. */}
      <section className="relative flex min-h-svh flex-col justify-end px-6 pb-14 sm:px-10">
        {/* Grounds the caption where the field runs bright behind it. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink via-ink/78 to-transparent"
        />
        <div className="over-field pointer-events-none relative mx-auto w-full max-w-[104rem]">
          <h1 className="rise text-sm font-medium tracking-tight">The field</h1>
          <p className="rise mt-3 max-w-md text-[0.9375rem] leading-relaxed text-muted">
            Every project is a body. Mass is stars, colour is language, and the
            filaments are particles thrown off one and captured by another.
          </p>
          <p className="tag rise mt-6 hidden md:block">
            Hover a name · scroll for the index
          </p>
          <p className="tag rise mt-6 md:hidden">Drag to stir · scroll for the index</p>
        </div>
      </section>

      <section className="relative bg-ink/90 backdrop-blur-[2px]">
        <div className="mx-auto max-w-[104rem] px-6 py-24 sm:px-10 sm:py-28">
          {grouped.map((group, groupIndex) => (
            <div key={group.category} className={groupIndex > 0 ? "mt-24" : ""}>
              <div className="mb-8 flex items-baseline justify-between gap-6">
                <h2 className="text-sm font-medium tracking-tight">
                  {CATEGORY_LABEL[group.category]}
                </h2>
                <span className="tag tabular-nums">
                  {String(group.items.length).padStart(2, "0")}
                </span>
              </div>
              <div className="border-b border-line">
                {group.items.map((project, i) => (
                  <ProjectRow key={project.slug} project={project} index={i} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <SiteFooter />
      </section>
    </>
  );
}
