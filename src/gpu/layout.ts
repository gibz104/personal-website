import type { Project } from "@/lib/projects";
import { languageColor } from "./palette";
import type { Attractor } from "./types";

export const GOLDEN_ANGLE = 2.399963229728653;

/** Hard ceiling shared with the WGSL uniform array. */
export const MAX_ATTRACTORS = 24;

/**
 * Places projects as bodies in world space on a phyllotaxis spiral. Ordering is
 * featured-first, so the strongest work sits near the centre and the tail
 * spreads outward without ever colliding.
 */
/** Deterministic per-name jitter, so the spiral reads organic, not generated. */
function jitter(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 8) % 10000) / 10000;
}

/** The box every layout is normalised into, in world units. */
export const FIELD_EXTENT = { x: 1.46, y: 0.86 } as const;

/**
 * Places projects as bodies in world space on a phyllotaxis spiral, then scales
 * the whole arrangement into FIELD_EXTENT. Normalising means the camera can be
 * framed against a known box instead of against however many repos exist.
 */
export function layoutAttractors(projects: Project[]): Attractor[] {
  const list = projects.slice(0, MAX_ATTRACTORS);
  if (list.length === 0) return [];
  const maxStars = Math.max(1, ...list.map((p) => p.stars));

  const raw = list.map((project, i) => {
    const j = jitter(project.name);
    const angle = i * GOLDEN_ANGLE + 0.7 + (j - 0.5) * 0.22;
    const radius = Math.sqrt(i + 0.35) * (0.92 + j * 0.16);
    return {
      project,
      x: Math.cos(angle) * radius * 1.62,
      y: Math.sin(angle) * radius,
      weight: Math.log1p(project.stars) / Math.log1p(maxStars),
    };
  });

  // Scale to fill the box on whichever axis binds first.
  const spanX = Math.max(...raw.map((r) => Math.abs(r.x)), 1e-6);
  const spanY = Math.max(...raw.map((r) => Math.abs(r.y)), 1e-6);
  const scale = Math.min(FIELD_EXTENT.x / spanX, FIELD_EXTENT.y / spanY);

  return raw.map(({ project, x, y, weight }) => ({
    slug: project.slug,
    label: project.title,
    x: x * scale,
    y: y * scale,
    // Logarithmic: 68 stars should read as heavier than 8, not 8.5x heavier.
    mass: 0.30 + weight * 0.95 + (project.featured ? 0.22 : 0),
    radius: 0.014 + weight * 0.020 + (project.featured ? 0.006 : 0),
    color: languageColor(project.language),
    featured: project.featured,
  }));
}

/** One element of the WGSL `array<Attractor, 24>` uniform. */
export type PackedAttractor = {
  posMass: [number, number, number, number];
  color: [number, number, number, number];
};

/**
 * Builds the fixed-size uniform array the shaders declare. Unused slots stay
 * zero-massed, which reads as absent everywhere they are used.
 */
export function packAttractors(attractors: Attractor[]): PackedAttractor[] {
  return Array.from({ length: MAX_ATTRACTORS }, (_, i) => {
    const a = attractors[i];
    if (!a) return { posMass: [0, 0, 0, 0], color: [0, 0, 0, 0] };
    return {
      posMass: [a.x, a.y, a.mass, a.radius],
      color: [a.color[0], a.color[1], a.color[2], a.featured ? 1 : 0],
    };
  });
}
