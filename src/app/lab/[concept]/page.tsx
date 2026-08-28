import Link from "next/link";
import { notFound } from "next/navigation";
import { HeroCanvas } from "@/components/hero-canvas";
import { HERO_VARIANTS, heroVariantById } from "@/gpu/hero/presets";

export function generateStaticParams() {
  return HERO_VARIANTS.map((v) => ({ concept: v.id }));
}

export async function generateMetadata({ params }: PageProps<"/lab/[concept]">) {
  const { concept } = await params;
  const found = heroVariantById(concept);
  return found ? { title: found.name } : {};
}

export default async function HeroPage({ params }: PageProps<"/lab/[concept]">) {
  const { concept } = await params;
  const found = heroVariantById(concept);
  if (!found) notFound();

  const index = HERO_VARIANTS.findIndex((v) => v.id === found.id);
  const next = HERO_VARIANTS[(index + 1) % HERO_VARIANTS.length]!;

  return (
    <div className="relative min-h-svh overflow-hidden bg-ink">
      <HeroCanvas variant={found.id} />

      <div className="pointer-events-none relative z-10 flex min-h-svh flex-col justify-between p-6 sm:p-10">
        <div className="flex items-start justify-between gap-6">
          <Link
            href="/lab"
            className="over-field pointer-events-auto tag transition-colors hover:text-muted"
          >
            ← Treatments
          </Link>
          <Link
            href={`/lab/${next.id}`}
            className="over-field pointer-events-auto tag transition-colors hover:text-muted"
          >
            Next: {next.name} →
          </Link>
        </div>

        <div className="over-field max-w-md">
          <p className="tag">Treatment {String(index + 1).padStart(2, "0")}</p>
          <h1 className="mt-3 text-4xl font-medium tracking-tight sm:text-5xl">
            {found.name}
          </h1>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted">
            {found.detail}
          </p>
          <p className="tag mt-5">Move the pointer to carry the source</p>
        </div>
      </div>
    </div>
  );
}
