import Image from "next/image";
import Link from "next/link";
import { HERO_VARIANTS } from "@/gpu/hero/presets";

export const metadata = { title: "Hero treatments" };

/**
 * A selection surface, not part of the site proper. Same composition in all
 * three; only the light behind the mark differs.
 */
export default function LabIndex() {
  return (
    <div className="min-h-svh bg-ink px-6 py-20 sm:px-10 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <p className="tag">Hero</p>
        <h1 className="mt-5 text-[clamp(2rem,5vw,3.25rem)] font-medium leading-[1.04] tracking-[-0.03em]">
          Three lights behind the mark.
        </h1>
        <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-muted">
          The same three layers throughout: the character matrix and its band of
          real code at the back, a source in the middle, and RG in front in deep
          black, blocking it. The pointer moves the source behind the letters.
          What differs is how the light behaves once the mark gets in its way.
        </p>

        <ul className="mt-16 space-y-16">
          {HERO_VARIANTS.map((variant, i) => (
            <li key={variant.id}>
              <Link href={`/lab/${variant.id}`} className="group block">
                <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-line bg-black">
                  <Image
                    src={`/lab/${variant.id}.jpg`}
                    alt={`${variant.name} treatment`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 72rem"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                    priority={i === 0}
                  />
                </div>

                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-2xl">
                    <div className="flex items-baseline gap-4">
                      <span className="tag tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h2 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">
                        {variant.name}
                      </h2>
                    </div>
                    <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
                      {variant.summary}
                    </p>
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
