import { Scene } from "@/components/scene";
import { SiteFooter } from "@/components/site-footer";
import { PROFILE } from "@/content/profile";
import { GITHUB_PROFILE, PROJECTS, TOTAL_STARS } from "@/lib/projects";

export const metadata = { title: "About" };

export default function AboutPage() {
  const since = new Date(GITHUB_PROFILE.createdAt).getFullYear();

  return (
    <>
      <Scene name="calm" />

      <div aria-hidden className="reading-scrim pointer-events-none fixed inset-0 z-0" />

      <section className="relative z-10 min-h-svh px-6 pb-24 pt-32 sm:px-10 sm:pt-40">
        <div className="mx-auto w-full max-w-[104rem]">
          <div className="max-w-2xl">
          <p className="tag rise">About</p>
          <h1
            className="rise mt-6 text-[clamp(2.25rem,6vw,3.75rem)] font-medium leading-[1.02] tracking-[-0.03em]"
            style={{ animationDelay: "80ms" }}
          >
            {PROFILE.name}
          </h1>
          <p
            className="rise mt-3 font-mono text-sm tracking-[0.14em] text-dim"
            style={{ animationDelay: "120ms" }}
          >
            {PROFILE.handle} · {PROFILE.location}
          </p>

          <div className="rise mt-12 space-y-6" style={{ animationDelay: "200ms" }}>
            {PROFILE.bio.map((paragraph) => (
              <p key={paragraph} className="text-[1.0625rem] leading-relaxed text-muted">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="rule mt-16 grid grid-cols-3 gap-8 pt-10">
            {[
              { label: "Public projects", value: PROJECTS.length },
              { label: "Stars earned", value: TOTAL_STARS },
              { label: "On GitHub since", value: since },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-medium tabular-nums tracking-tight">
                  {stat.value}
                </p>
                <p className="tag mt-2">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="rule mt-16 pt-10">
            <p className="tag mb-6">Stack</p>
            <dl className="space-y-5">
              {PROFILE.stack.map((group) => (
                <div key={group.label} className="flex flex-col gap-2 sm:flex-row sm:gap-8">
                  <dt className="w-28 shrink-0 font-mono text-[0.6875rem] tracking-[0.14em] uppercase text-dim">
                    {group.label}
                  </dt>
                  <dd className="text-[0.9375rem] text-muted">
                    {group.items.join(" · ")}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rule mt-16 pt-10">
            <p className="tag mb-6">Elsewhere</p>
            <ul className="space-y-px">
              {PROFILE.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-baseline justify-between gap-6 border-t border-line py-5 transition-colors hover:bg-white/[0.02]"
                  >
                    <span className="text-lg font-medium tracking-tight">{link.label}</span>
                    <span className="font-mono text-[0.8125rem] text-dim transition-colors group-hover:text-muted">
                      {link.handle} ↗
                    </span>
                  </a>
                </li>
              ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="relative bg-ink/90 backdrop-blur-[2px]">
        <SiteFooter />
      </div>
    </>
  );
}
