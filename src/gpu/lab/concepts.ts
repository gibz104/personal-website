import type { RevealTuning } from "./pipeline";
import type { ConceptId } from "./shaders";

export type Concept = {
  id: ConceptId;
  name: string;
  summary: string;
  detail: string;
  /** The distinct layers of interaction, so they can be compared directly. */
  layers: string[];
  tuning: RevealTuning;
};

export const CONCEPTS: Concept[] = [
  {
    id: "trail",
    name: "Trail",
    summary: "The page remembers where you have been.",
    detail:
      "The cursor paints into a field that fades over several seconds, so exploring accumulates. You can clear a region, write across the screen, and watch your own path close behind you.",
    layers: [
      "Move to decode — the path persists and slowly re-scrambles",
      "Speed changes the brush: a flick streaks, a slow pass blooms",
      "Click to stamp a deep mark that holds much longer",
      "Single characters glint on their own, everywhere",
    ],
    tuning: { decay: 0.988, radius: 0.17, strength: 1.0, clickRadius: 0.26 },
  },
  {
    id: "focus",
    name: "Focus",
    summary: "Rewards slowing down and reading.",
    detail:
      "Three layers doing different jobs. A tight lens resolves characters completely. A dim band across the cursor's row shows where a line runs without letting you read it. Holding still widens the lens and pulls the whole row into focus.",
    layers: [
      "A tight lens resolves whatever is under it",
      "A dim band marks the line you are on — direction, not content",
      "Hold still and the lens widens until the row is readable",
      "Click to pin that row so it stays legible while you move on",
    ],
    tuning: { decay: 0.905, radius: 0.09, strength: 0.85, clickRadius: 0.12 },
  },
  {
    id: "cascade",
    name: "Cascade",
    summary: "Rain that reads. One character wide, so it never gives you a line.",
    detail:
      "Narrow columns of decode fall down the page. Each is a single character wide, so a drop hands you a word and never a sentence — it keeps the rhythm without answering the question the cursor asks.",
    layers: [
      "Drops fall continuously, one character wide",
      "Move to decode locally; the path persists briefly",
      "Drops near the pointer resolve harder — chase one across the page",
      "Click to seed a burst of drops where you struck",
    ],
    tuning: { decay: 0.968, radius: 0.13, strength: 0.95, clickRadius: 0.18 },
  },
];

export function conceptById(id: string): Concept | undefined {
  return CONCEPTS.find((c) => c.id === id);
}
