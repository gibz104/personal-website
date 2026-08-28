import Link from "next/link";
import { notFound } from "next/navigation";
import { LanguageBar } from "@/components/language-bar";
import { Scene } from "@/components/scene";
import { SiteFooter } from "@/components/site-footer";
import { languageCss } from "@/gpu/palette";
import { CATEGORY_LABEL, PROJECTS, projectBySlug } from "@/lib/projects";

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const project = projectBySlug(slug);
  if (!project) return {};
  return { title: project.title, description: project.tagline };
}

const dateOf = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short" });

export default async function ProjectPage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const project = projectBySlug(slug);
  if (!project) notFound();

  const index = PROJECTS.findIndex((p) => p.slug === project.slug);
  const next = PROJECTS[(index + 1) % PROJECTS.length]!;
  const accent = languageCss(project.language);

  const facts = [
    { label: "Category", value: CATEGORY_LABEL[project.category] },
    { label: "Language", value: project.language ?? "—" },
    { label: "Stars", value: project.stars > 0 ? `${project.stars}` : "—" },
    { label: "Forks", value: project.forks > 0 ? `${project.forks}` : "—" },
    { label: "Started", value: dateOf(project.createdAt) },
    { label: "Last push", value: dateOf(project.pushedAt) },
  ];

  return (
    <>
      <Scene name="focus" focus={project.slug} />

      <div aria-hidden className="reading-scrim pointer-events-none fixed inset-0 z-0" />

      <article className="relative z-10 min-h-svh px-6 pb-24 pt-32 sm:px-10 sm:pt-40">
        <div className="mx-auto w-full max-w-[104rem]">
          <div className="max-w-2xl">
          <Link href="/work" className="tag transition-colors hover:text-muted">
            ← Work
          </Link>

          <header className="mt-10">
            <span
              className="font-mono text-[0.6875rem] tracking-[0.16em] uppercase"
              style={{ color: accent }}
            >
              {CATEGORY_LABEL[project.category]}
            </span>
            <h1 className="mt-4 text-[clamp(2.25rem,6vw,3.75rem)] font-medium leading-[1.02] tracking-[-0.03em]">
              {project.title}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted">
              {project.tagline}
            </p>
          </header>

          {project.blurb ? (
            <p className="panel mt-10 rounded-xl p-6 text-[0.9375rem] leading-relaxed text-text/90">
              {project.blurb}
            </p>
          ) : null}

          <div className="mt-12 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.label}>
                <p className="tag">{fact.label}</p>
                <p className="mt-1.5 text-[0.9375rem] tabular-nums">{fact.value}</p>
              </div>
            ))}
          </div>

          {project.languages.length > 0 ? (
            <div className="mt-12">
              <p className="tag mb-4">Composition</p>
              <LanguageBar languages={project.languages} />
            </div>
          ) : null}

          {project.summary ? (
            <div className="mt-14">
              <p className="tag mb-4">From the README</p>
              <p className="text-[0.9375rem] leading-relaxed text-muted">
                {project.summary}
              </p>
            </div>
          ) : null}

          {project.highlights.length > 0 ? (
            <ul className="mt-10 space-y-3.5">
              {project.highlights.map((item) => (
                <li key={item} className="flex gap-4 text-[0.9375rem] leading-relaxed text-muted">
                  <span
                    aria-hidden
                    className="mt-2.5 size-1 shrink-0 rounded-full"
                    style={{ background: accent }}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {project.topics.length > 0 ? (
            <div className="mt-14">
              <p className="tag mb-4">Topics</p>
              <ul className="flex flex-wrap gap-2">
                {project.topics.map((topic) => (
                  <li
                    key={topic}
                    className="rounded-full border border-line px-3 py-1 font-mono text-[0.6875rem] tracking-[0.08em] text-dim"
                  >
                    {topic}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-14 flex flex-wrap gap-3">
            <a
              href={project.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-line-strong px-6 py-2.5 text-sm transition-colors hover:border-white/30 hover:bg-white/[0.04]"
            >
              Source on GitHub ↗
            </a>
            {project.homepage ? (
              <a
                href={project.homepage}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-line px-6 py-2.5 text-sm text-muted transition-colors hover:border-line-strong hover:text-text"
              >
                Live site ↗
              </a>
            ) : null}
          </div>

            <Link
              href={`/work/${next.slug}`}
              className="rule mt-20 flex items-baseline justify-between gap-6 pt-8 transition-colors hover:text-text"
            >
              <span className="tag">Next</span>
              <span className="text-xl font-medium tracking-tight">{next.title} →</span>
            </Link>
          </div>
        </div>
      </article>

      <div className="relative bg-ink/90 backdrop-blur-[2px]">
        <SiteFooter />
      </div>
    </>
  );
}
