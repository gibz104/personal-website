import { Presence } from "@/components/presence";
import { SocialLinks } from "@/components/social-links";
import { PROFILE } from "@/content/profile";

export const metadata = {
  title: "About",
  description: PROFILE.tagline,
};

export default function AboutPage() {
  return (
    <>
      <Presence value={0.26} />

      <div aria-hidden className="veil" />

      <main className="relative z-10 mx-auto min-h-svh max-w-3xl px-6 pb-28 pt-28 sm:px-8 sm:pt-32">
        <p className="tag">About</p>
        <h1 className="mt-5 text-[clamp(1.75rem,4.5vw,2.75rem)] font-medium leading-[1.1] tracking-[-0.03em]">
          {PROFILE.name}
        </h1>
        <p className="mt-3 font-mono text-sm tracking-[0.14em] text-dim">
          {PROFILE.handle} · {PROFILE.location}
        </p>

        <div className="mt-12 space-y-6">
          {PROFILE.bio.map((paragraph) => (
            <p key={paragraph} className="text-[1.0625rem] leading-relaxed text-muted">
              {paragraph}
            </p>
          ))}
        </div>

        <div className="rule mt-16 pt-10">
          <p className="tag mb-6">Stack</p>
          <dl className="space-y-5">
            {PROFILE.stack.map((group) => (
              <div key={group.label} className="flex flex-col gap-1.5 sm:flex-row sm:gap-8">
                <dt className="w-28 shrink-0 font-mono text-[0.6875rem] tracking-[0.14em] uppercase text-dim">
                  {group.label}
                </dt>
                <dd className="text-[0.9375rem] text-muted">{group.items.join(" · ")}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rule mt-16 flex items-center justify-between gap-6 pt-10">
          <p className="tag">Elsewhere</p>
          <SocialLinks />
        </div>
      </main>
    </>
  );
}
