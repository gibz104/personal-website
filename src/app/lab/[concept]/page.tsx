import Link from "next/link";
import { notFound } from "next/navigation";
import { LabCanvas } from "@/components/lab-canvas";
import { CONCEPTS, conceptById } from "@/gpu/lab/concepts";

export function generateStaticParams() {
  return CONCEPTS.map((c) => ({ concept: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/lab/[concept]">) {
  const { concept } = await params;
  const found = conceptById(concept);
  return found ? { title: found.name } : {};
}

export default async function ConceptPage({ params }: PageProps<"/lab/[concept]">) {
  const { concept } = await params;
  const found = conceptById(concept);
  if (!found) notFound();

  const index = CONCEPTS.findIndex((c) => c.id === found.id);
  const next = CONCEPTS[(index + 1) % CONCEPTS.length]!;

  return (
    <div className="relative min-h-svh overflow-hidden bg-ink">
      <LabCanvas concept={found.id} />

      {/* Everything below floats over the canvas and stays pointer-transparent
          except the links, so the whole surface remains interactive. */}
      <div className="pointer-events-none relative z-10 flex min-h-svh flex-col justify-between p-6 sm:p-10">
        <div className="flex items-start justify-between gap-6">
          <Link
            href="/lab"
            className="over-field pointer-events-auto tag transition-colors hover:text-muted"
          >
            ← Concepts
          </Link>
          <Link
            href={`/lab/${next.id}`}
            className="over-field pointer-events-auto tag transition-colors hover:text-muted"
          >
            Next: {next.name} →
          </Link>
        </div>

        <div className="over-field max-w-md">
          <p className="tag">
            Concept {String(index + 1).padStart(2, "0")}
          </p>
          <h1 className="mt-3 text-4xl font-medium tracking-tight sm:text-5xl">
            {found.name}
          </h1>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted">
            {found.detail}
          </p>
          <p className="tag mt-5">{found.interaction}</p>
        </div>
      </div>
    </div>
  );
}
