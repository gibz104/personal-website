import type { RevealTuning } from "./pipeline";
import type { ConceptId } from "./shaders";

export type Concept = {
  id: ConceptId;
  name: string;
  /** The verb. What the pointer actually does. */
  verb: string;
  summary: string;
  detail: string;
  layers: string[];
  tuning: RevealTuning;
};

/**
 * Every variant shares the same page behaviour — the code scrolls, a scan bar
 * sweeps it, drops fall through it, characters glint. What differs is the one
 * thing the pointer is for. None of them reveals.
 */
export const CONCEPTS: Concept[] = [
  {
    id: "lantern",
    name: "Lantern",
    verb: "Illuminate",
    summary: "The pointer is a light, not a window.",
    detail:
      "The page decodes on its own. What the pointer controls is the lighting: shafts are marched through the glyphs toward the cursor, so the gaps between characters become beams and lit code burns in its syntax colour.",
    layers: [
      "Volumetric shafts through the characters, following the cursor",
      "A scan bar sweeps the page and lights it as it decodes",
      "Drops fall continuously, one character wide",
      "The code scrolls; single characters glint on their own",
    ],
    tuning: { decay: 0.94, radius: 0.10, strength: 0.55, clickRadius: 0.18, spread: 0 },
  },
  {
    id: "wake",
    name: "Wake",
    verb: "Disturb",
    summary: "The pointer drags the stream out of line.",
    detail:
      "The page is a falling column of text. Moving through it bends the characters around the cursor and they swing back once you leave. Faster movement tears harder, and the shear glows where the flow is worked most.",
    layers: [
      "Characters bend and swirl around the cursor",
      "Speed changes the drag — a flick tears, a slow pass leans",
      "The shear itself catches light where the flow is worked",
      "Scan bar, drops, scrolling and glints carry the reading",
    ],
    tuning: { decay: 0.93, radius: 0.09, strength: 0.45, clickRadius: 0.16, spread: 0 },
  },
  {
    id: "charge",
    name: "Charge",
    verb: "Kindle",
    summary: "The pointer plants fires that keep burning after you go.",
    detail:
      "Moving deposits energy into a field that bleeds outward and decays. Where it crosses the ignition threshold a cell catches — it resolves, flares, and hands charge to its neighbours, so a stroke keeps spreading once you have moved on.",
    layers: [
      "Charge spreads outward from your path on its own",
      "Ignition is a threshold, so it reads as fire travelling",
      "Embers run hot at the front and cool behind it",
      "Scan bar, drops, scrolling and glints carry the reading",
    ],
    tuning: { decay: 0.975, radius: 0.075, strength: 1.0, clickRadius: 0.13, spread: 0.42 },
  },
];

export function conceptById(id: string): Concept | undefined {
  return CONCEPTS.find((c) => c.id === id);
}
