import type { FlarePreset } from "./pipeline";

export type HeroVariant = {
  id: string;
  name: string;
  summary: string;
  detail: string;
  preset: FlarePreset;
};

/**
 * Three ways for the light to behave behind the mark. Same machinery
 * throughout — the difference is how much of it is spokes, how much is pool,
 * and how hard the contour catches.
 */
export const HERO_VARIANTS: HeroVariant[] = [
  {
    id: "halo",
    name: "Halo",
    summary: "A pool of light behind the mark, barely any spokes.",
    detail:
      "The source sits behind RG and mostly just glows. Shafts are damped almost out, so the letterforms float in a soft field that shifts as the light moves. The most restrained of the three, and the easiest to put a headline next to.",
    preset: {
      core: 0.105, reach: 0.30, shafts: 0.55, halo: 0.70,
      intensity: 1.9, rim: 0.60, bloom: 0.30, flareWeight: 1.0,
    },
  },
  {
    id: "rays",
    name: "Rays",
    summary: "Full shafts, breaking around the letterforms.",
    detail:
      "The marched shafts run at full weight, so the light visibly streams past the strokes of the R and through the counter of the G. Closest to the flare example, and the most dramatic when the pointer sweeps the source across the mark.",
    preset: {
      core: 0.062, reach: 0.34, shafts: 3.20, halo: 0.12,
      intensity: 2.3, rim: 0.85, bloom: 0.30, flareWeight: 1.0,
    },
  },
  {
    id: "edge",
    name: "Edge",
    summary: "A hard contour catch, and very little else.",
    detail:
      "Almost no volumetric light. What reads instead is a thin bright line along whichever side of the mark currently faces the source, so the monogram is described by its own outline. The most graphic, and the darkest overall.",
    preset: {
      core: 0.050, reach: 0.22, shafts: 0.70, halo: 0.10,
      intensity: 1.7, rim: 2.2, bloom: 0.26, flareWeight: 0.80,
    },
  },
];

export function heroVariantById(id: string): HeroVariant | undefined {
  return HERO_VARIANTS.find((v) => v.id === id);
}
