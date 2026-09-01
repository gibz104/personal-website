import { Presence } from "@/components/presence";
import { EXPERIENCE } from "@/content/experience";

export const metadata = {
  title: "Work",
  description: "Nine years at Kraft Heinz, from financial analyst to data engineer.",
};

export default function WorkPage() {
  return (
    <>
      <Presence value={0.9} />
      <div aria-hidden className="veil" />

      <main className="relative z-10 mx-auto min-h-svh max-w-3xl px-6 pb-28 pt-28 sm:px-8 sm:pt-32">
        <header className="mb-16">
          <p className="tag">Work</p>
          <h1 className="mt-5 max-w-2xl text-[clamp(1.75rem,4.5vw,2.75rem)] font-medium leading-[1.1] tracking-[-0.03em]">
            Nine years at one company, and seven different jobs inside it.
          </h1>
          <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-muted">
            I joined to do finance and left doing data engineering. The line
            between those two turned out to be much blurrier than I was told.
          </p>
        </header>

        {EXPERIENCE.map((position) => (
          <section key={position.company} className="rule pt-10">
            <div className="mb-10 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h2 className="text-xl font-medium tracking-tight">{position.company}</h2>
              <p className="tag">
                {position.where} · {position.period}
              </p>
            </div>

            <ol className="space-y-11">
              {position.roles.map((role) => (
                <li key={role.title}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                    <h3 className="font-mono text-[0.9375rem] text-text">{role.title}</h3>
                    <p className="tag tabular-nums">{role.period}</p>
                  </div>
                  <ul className="mt-3 space-y-2.5">
                    {role.points.map((point) => (
                      <li
                        key={point}
                        className="flex gap-3.5 text-[0.9375rem] leading-relaxed text-muted"
                      >
                        <span aria-hidden className="mt-2.5 size-1 shrink-0 rounded-full bg-dim" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </main>
    </>
  );
}
