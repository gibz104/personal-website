import type { FlarePreset } from "./pipeline";

export type HeroVariant = {
  id: string;
  name: string;
  summary: string;
  detail: string;
  preset: FlarePreset;
};

/** The reference's own colour: a pale blue-lavender, not white. */
const FLARE_COLOR = [179 / 255, 191 / 255, 1] as const;

/** Everything the nextjs-flare example ships with, as the starting point. */
const REFERENCE: FlarePreset = {
  spotReach: 0.5,
  spotStroke: 0.9,
  extension: 0.6,
  beamIntensity: 0.8,
  spotFocus: 0.08,
  scatter: 1,
  rimFill: 1,
  rimIntensity: 1,
  logoOpacity: 1,
  smoothness: 1,
  filmGrain: 0.03,
  verticalEdgeFade: 0.1,
  markDarkness: 0.96,
  flareColor: FLARE_COLOR,
};

export const HERO_VARIANTS: HeroVariant[] = [
  {
    id: "flare",
    name: "Flare",
    summary: "The reference settings, unchanged.",
    detail:
      "Every parameter as the nextjs-flare example ships it — the same rim falloff, the same 48-step walk, the same pale blue-lavender. The only differences are the mark and the character matrix behind it.",
    preset: { ...REFERENCE },
  },
  {
    id: "reach",
    name: "Reach",
    summary: "Longer beams, thrown further across the frame.",
    detail:
      "Extension raised, so the walk steps further and decays more slowly. The light off the letters carries most of the way to the edges instead of staying close to the mark.",
    preset: { ...REFERENCE, extension: 0.88, beamIntensity: 0.95, spotFocus: 0.11 },
  },
  {
    id: "close",
    name: "Close",
    summary: "Tighter to the letters, more edge than beam.",
    detail:
      "Extension pulled back and the rim pushed up, so the glow hugs the mark and the scattering stays short. The letters read as lit objects rather than as sources throwing light across the page.",
    preset: {
      ...REFERENCE,
      extension: 0.38,
      beamIntensity: 0.55,
      rimIntensity: 1.25,
      spotStroke: 1.4,
      spotFocus: 0.06,
    },
  },
];

export function heroVariantById(id: string): HeroVariant | undefined {
  return HERO_VARIANTS.find((v) => v.id === id);
}
