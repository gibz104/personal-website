import type { RevealTuning } from "./pipeline";
import type { ConceptId } from "./shaders";

export type Concept = {
  id: ConceptId;
  name: string;
  /** What the light is doing. */
  verb: string;
  summary: string;
  detail: string;
  layers: string[];
  tuning: RevealTuning;
};

/**
 * Every variant shares the same page: the code scrolls, a soft band of decoding
 * travels through it, one-character drops fall, characters glint. No bar, no
 * beam, nothing to watch go past.
 *
 * What differs is where the light comes from and how it gives the page depth.
 * In all three the pointer only ever nudges the source a fraction of the
 * viewport — it never carries it.
 */
export const CONCEPTS: Concept[] = [
  {
    id: "relief",
    name: "Relief",
    verb: "One soft key light",
    summary: "The text stops being flat.",
    detail:
      "A single soft light sits roughly overhead. Each character gets a pseudo-normal from its own coverage gradient, so its strokes catch the light on the side facing it and fall away on the other. The pointer tilts the light a fraction of the viewport — the page seems to turn toward you.",
    layers: [
      "Characters are embossed by a key light that never moves far",
      "A thin edge catch where strokes face the source",
      "The pointer tilts the light; it does not carry it",
      "Scrolling code, a soft decode band, drops and glints",
    ],
    tuning: { decay: 0.93, radius: 0.09, strength: 0.35, clickRadius: 0.14, spread: 0 },
  },
  {
    id: "strata",
    name: "Strata",
    verb: "Depth by parallax",
    summary: "Three planes of code, sliding against each other.",
    detail:
      "The code lives on three sheets at different scales. The pointer moves the viewpoint rather than the content, so the planes slide against one another and the page gains thickness. The key light falls off with depth, leaving the far sheets in cool shadow.",
    layers: [
      "Three planes at different scales and depths",
      "The pointer leans the viewpoint, and the planes part",
      "Distance cools and dims — the far sheets sit back",
      "Only the front sheet decodes fully, so the eye knows where to look",
    ],
    tuning: { decay: 0.93, radius: 0.09, strength: 0.30, clickRadius: 0.14, spread: 0 },
  },
  {
    id: "emitters",
    name: "Emitters",
    verb: "The code is the light",
    summary: "Nothing shines on the page from outside.",
    detail:
      "The band of decoding is a soft area light travelling through the page, each falling drop is a small moving one, and resolved characters glow on their own. The pointer adds one more soft source that it carries but never sharpens.",
    layers: [
      "Light comes only from what the page is currently doing",
      "Resolved characters pool their own colour beneath them",
      "The decode band is a body of light, not an edge",
      "The pointer is a hand cupped near the page, not a torch",
    ],
    tuning: { decay: 0.94, radius: 0.10, strength: 0.40, clickRadius: 0.16, spread: 0 },
  },
];

export function conceptById(id: string): Concept | undefined {
  return CONCEPTS.find((c) => c.id === id);
}
