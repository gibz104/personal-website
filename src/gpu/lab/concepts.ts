import type { ConceptId } from "./shaders";

export type Concept = {
  id: ConceptId;
  name: string;
  /** One line, for the card. */
  summary: string;
  /** What it is doing and why, for the detail overlay. */
  detail: string;
  /** What the pointer does. */
  interaction: string;
};

export const CONCEPTS: Concept[] = [
  {
    id: "prism",
    name: "Prism",
    summary: "A wall of code, backlit. Light carves beams through the characters.",
    detail:
      "Volumetric shafts are marched in screen space from every pixel toward the light source. Glyphs occlude the path, so the gaps between characters become the beams, and the code lights up in its own syntax colours where the light reaches it.",
    interaction: "Move to carry the light. The beams follow.",
  },
  {
    id: "aperture",
    name: "Aperture",
    summary: "Frosted glass over a page of code. Your cursor is the lens.",
    detail:
      "The sheet is opaque until you touch it. Inside the lens the frost clears, the code magnifies, and the glass splits colour at the rim the way real optics do. Clicking sends a ring of clarity out across the sheet.",
    interaction: "Move to clear the frost. Click to send a ring.",
  },
  {
    id: "decode",
    name: "Decode",
    summary: "A field of scrambled characters that resolves where you look.",
    detail:
      "Every cell holds a real line of code but shows a random glyph until the decode field reaches it. Cells flip individually against their own threshold, so the reveal reads as decryption rather than as a fade. A band sweeps the page on its own.",
    interaction: "Move to decode. Click for a shockwave.",
  },
];

export function conceptById(id: string): Concept | undefined {
  return CONCEPTS.find((c) => c.id === id);
}
