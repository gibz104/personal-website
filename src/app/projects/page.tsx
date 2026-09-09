import { ProjectList } from "@/components/project-list";
import { Presence } from "@/components/presence";
import { listedProjects } from "@/lib/projects";

export const metadata = {
  title: "Projects",
  description:
    "Nights-and-weekends projects: Ethereum indexers in Rust, ESP32 sensor "
    + "firmware in C, a self-hosted Ethereum node, and filament tracking for "
    + "Bambu Lab and Creality printers.",
  alternates: { canonical: "/projects" },
};

export default async function ProjectsPage() {
  const projects = await listedProjects();

  return (
    <>
      <Presence value={0.9} />

      <div aria-hidden className="veil" />

      <main className="relative z-10 mx-auto min-h-svh max-w-4xl px-6 pb-44 pt-28 sm:px-8 sm:pb-52 sm:pt-32">
        <header className="mb-14">
          <p className="tag">Projects</p>
          <h1 className="mt-5 max-w-2xl text-[clamp(1.75rem,4.5vw,2.75rem)] font-medium leading-[1.1] tracking-[-0.03em]">
            Nights and weekends.
          </h1>
          <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-muted">
            None of this is my day job. Ethereum indexers in Rust, firmware for
            sensors in places I can&rsquo;t reach, and a few things that exist
            only because something annoyed me enough to fix it.
          </p>
        </header>

        <ProjectList projects={projects} />
      </main>
    </>
  );
}
