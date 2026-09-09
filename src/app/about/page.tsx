import Image from "next/image";
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
      <Presence value={0.9} />
      <div aria-hidden className="veil" />

      <main className="relative z-10 mx-auto min-h-svh max-w-3xl px-6 pb-44 pt-28 sm:px-8 sm:pb-52 sm:pt-32">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
          <div>
            <p className="tag">About</p>
            <h1 className="mt-5 text-[clamp(1.75rem,4.5vw,2.75rem)] font-medium leading-[1.1] tracking-[-0.03em]">
              {PROFILE.name}
            </h1>
            <p className="mt-3 font-mono text-sm tracking-[0.14em] text-dim">
              {PROFILE.role} · {PROFILE.location}
            </p>
          </div>

          {/* Circular, because the photo was shot on a near-white background and
              a square of it would punch a hole in the page. The ring and the
              faint halo are the same treatment the mark gets, so the one bright
              thing on a dark page still looks like it belongs to the site. */}
          <Image
            src="/portrait.jpg"
            alt={PROFILE.name}
            width={512}
            height={512}
            priority
            className="size-28 shrink-0 rounded-full object-cover ring-1 ring-white/15 shadow-[0_0_44px_rgba(120,170,255,0.14)] sm:size-32"
          />
        </div>

        <div className="mt-12 space-y-6">
          {PROFILE.bio.map((paragraph) => (
            <p key={paragraph} className="text-[1.0625rem] leading-relaxed text-muted">
              {paragraph}
            </p>
          ))}
        </div>

        <div className="rule mt-16 pt-10">
          <p className="tag mb-7">Education</p>
          <ul className="space-y-6">
            {PROFILE.education.map((entry) => (
              <li
                key={entry.school}
                className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
              >
                <span>
                  <span className="block text-[0.9375rem] text-text">{entry.credential}</span>
                  <span className="mt-0.5 block text-[0.9375rem] text-muted">
                    {entry.school}
                  </span>
                </span>
                <span className="tag shrink-0 tabular-nums">{entry.years}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rule mt-16 pt-10">
          <p className="tag mb-7">Certifications</p>
          <ul className="space-y-6">
            {PROFILE.certifications.map((entry) => (
              <li
                key={entry.name}
                className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
              >
                <span>
                  <span className="block text-[0.9375rem] text-text">{entry.name}</span>
                  <span className="mt-0.5 block text-[0.9375rem] text-muted">
                    {entry.issuer}
                  </span>
                </span>
                <span className="tag shrink-0 tabular-nums">{entry.year}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rule mt-16 pt-10">
          <p className="tag mb-7">Tools</p>
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

        {/* Pulled back by the icons' own padding so they sit on the same left
            edge as every other line on the page. */}
        <div className="rule mt-16 pt-10">
          <SocialLinks className="-ml-1.5 sm:-ml-2" />
        </div>
      </main>
    </>
  );
}
