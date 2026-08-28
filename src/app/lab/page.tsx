import Image from "next/image";
import Link from "next/link";
import { CONCEPTS } from "@/gpu/lab/concepts";

export const metadata = { title: "Hero concepts" };

/**
 * A selection surface, not part of the site proper. Three candidate hero
 * treatments, each running the real shader. The stills are headless renders of
 * those same shaders, so the card and the page agree.
 */
export default function LabIndex() {
  return (
    <div className="min-h-svh bg-ink px-6 py-20 sm:px-10 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <p className="tag">Concepts</p>
        <h1 className="mt-5 text-[clamp(2rem,5vw,3.25rem)] font-medium leading-[1.04] tracking-[-0.03em]">
          Three ways in.
        </h1>
        <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-muted">
          Each is a full-screen WebGPU hero with code baked into the artwork —
          independent of the project list, so adding or removing a repository
          never changes it. Open one and move the pointer.
        </p>

        <ul className="mt-16 space-y-16">
          {CONCEPTS.map((concept, i) => (
            <li key={concept.id}>
              <Link href={`/lab/${concept.id}`} className="group block">
                <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-line bg-black">
                  <Image
                    src={`/lab/${concept.id}.jpg`}
                    alt={`${concept.name} concept`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 72rem"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                    priority={i === 0}
                  />
                </div>

                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-xl">
                    <div className="flex items-baseline gap-4">
                      <span className="tag tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h2 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">
                        {concept.name}
                      </h2>
                    </div>
                    <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
                      {concept.summary}
                    </p>
                    <p className="tag mt-3">{concept.interaction}</p>
                  </div>
                  <span className="tag shrink-0 transition-colors group-hover:text-muted">
                    Open live →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <div className="rule mt-20 pt-8">
          <Link href="/" className="tag transition-colors hover:text-muted">
            ← Back to the site
          </Link>
        </div>
      </div>
    </div>
  );
}
