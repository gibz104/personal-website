import type { FlarePreset } from "./pipeline";

export type HeroVariant = {
  id: string;
  name: string;
  summary: string;
  detail: string;
  preset: FlarePreset;
};

/**
 * All three are the same idea, restrained: a lit contour around the mark and
 * very little else behind it. The differences are in degree — how uniform the
 * outline is, and how much glow is allowed to escape from behind the letters.
 */
export const HERO_VARIANTS: HeroVariant[] = [
  {
    id: "trace",
    name: "Trace",
    summary: "A clean lit outline, and almost nothing else.",
    detail:
      "The contour is lit evenly the whole way round, so the monogram reads as a drawn line rather than as a lit object. Behind it, only enough glow to separate the letters from the matrix. The most restrained of the three.",
    preset: {
      core: 0.10, reach: 0.16, shafts: 0.16, halo: 0.22,
      intensity: 0.85, outlineWidth: 2.0, outlineWeight: 2.6, outlineRake: 0.18,
      outlineGlow: 0.85, bloom: 0.20, flareWeight: 0.72,
    },
  },
  {
    id: "rake",
    name: "Rake",
    summary: "The outline brightens on whichever side faces the light.",
    detail:
      "Same stroke, but its brightness travels around the contour as the source moves, so the pointer visibly lights one side of the letters and lets the other fall back. The outline never breaks — the far side dims but still closes the shape.",
    preset: {
      core: 0.095, reach: 0.18, shafts: 0.20, halo: 0.26,
      intensity: 0.95, outlineWidth: 2.2, outlineWeight: 3.0, outlineRake: 0.85,
      outlineGlow: 0.95, bloom: 0.20, flareWeight: 0.78,
    },
  },
  {
    id: "ember",
    name: "Ember",
    summary: "The outline, with a warmer bloom allowed out from behind.",
    detail:
      "A slightly softer stroke sitting in a little more light. The glow behind the letters is still low, but present enough that the mark feels lit from within rather than drawn on top.",
    preset: {
      core: 0.135, reach: 0.24, shafts: 0.22, halo: 0.46,
      intensity: 1.05, outlineWidth: 2.5, outlineWeight: 2.1, outlineRake: 0.42,
      outlineGlow: 1.5, bloom: 0.24, flareWeight: 0.92,
    },
  },
];

export function heroVariantById(id: string): HeroVariant | undefined {
  return HERO_VARIANTS.find((v) => v.id === id);
}
