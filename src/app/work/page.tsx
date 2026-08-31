import { ProjectList } from "@/components/project-list";
import { Presence } from "@/components/presence";
import { FEATURED, PROJECTS } from "@/lib/projects";

export const metadata = {
  title: "Work",
  description: "Selected projects — onchain infrastructure, embedded systems, and tooling.",
};

export default function WorkPage() {
  return (
    <>
      <Presence value={0.30} />

      <div aria-hidden className="veil" />

      <main className="relative z-10 mx-auto min-h-svh max-w-4xl px-6 pb-28 pt-28 sm:px-8 sm:pt-32">
        <header className="mb-14">
          <p className="tag">Work</p>
          <h1 className="mt-5 max-w-2xl text-[clamp(1.75rem,4.5vw,2.75rem)] font-medium leading-[1.1] tracking-[-0.03em]">
            Infrastructure for data that doesn&rsquo;t stop arriving.
          </h1>
          <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-muted">
            Indexers that run inside the node instead of polling it, firmware for
            sensors that report from places I can&rsquo;t reach, and the tooling
            that holds it together.
          </p>
        </header>

        <ProjectList projects={FEATURED} />

        <p className="tag mt-10">
          {FEATURED.length} of {PROJECTS.length} shown · every title links to its source
        </p>
      </main>
    </>
  );
}
