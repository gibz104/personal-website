/**
 * Display faces the monogram can be set in. The first is the one in use.
 *
 * The alternates are kept because swapping the mark is then a one-line change,
 * and because the choice is worth revisiting: what matters is not how a face
 * looks on paper but how its contour holds the light, which only shows in the
 * running scene.
 *
 * Drop a licensed `.ttf` into `public/fonts/` and add a row here to try it.
 */
export type MarkFace = {
  id: string;
  /** Shown in the switcher. */
  name: string;
  /** What it is, and which of the shortlisted faces it stands in for. */
  note: string;
  /** CSS family name, matching the @font-face rule in globals.css. */
  family: string;
  /** File under public/fonts, without extension. Absent for system faces. */
  file?: string;
  weight: number;
  /** Letter spacing as a fraction of cap height. Negative tightens. */
  tracking: number;
  /** Contour weight as a fraction of cap height. */
  stroke: number;
};

export const MARK_FACES: MarkFace[] = [
  {
    id: "archivo",
    name: "Archivo",
    note: "The mark. A sturdy grotesk: heavy enough to block the light cleanly, with counters open enough to let some through.",
    family: '"Archivo"',
    file: "archivo",
    weight: 800,
    tracking: 0.040,
    stroke: 0.0115,
  },
  {
    id: "arial-black",
    name: "Arial Black",
    note: "Heavier silhouette, blocks more light.",
    family: '"Arial Black"',
    weight: 900,
    tracking: 0.045,
    stroke: 0.0115,
  },
  {
    id: "hanken",
    name: "Hanken Grotesk",
    note: "From the shortlist. Warm geometric grotesk, open counters.",
    family: '"Hanken Grotesk"',
    file: "hanken",
    weight: 800,
    tracking: 0.040,
    stroke: 0.0115,
  },
  {
    id: "syne",
    name: "Syne",
    note: "Art-school grotesk with odd joints — closest to Bricolage's character.",
    family: '"Syne"',
    file: "syne",
    weight: 800,
    tracking: 0.030,
    stroke: 0.0115,
  },
  {
    id: "fraunces",
    name: "Fraunces",
    note: "Display serif with deliberate wonk — stands in for Sovana and Anona.",
    family: '"Fraunces"',
    file: "fraunces",
    weight: 900,
    tracking: 0.025,
    stroke: 0.0105,
  },
  {
    id: "bodoni",
    name: "Bodoni Moda",
    note: "High-contrast didone — the IvyPresto register. Hairlines barely occlude.",
    family: '"Bodoni Moda"',
    file: "bodoni",
    weight: 700,
    tracking: 0.020,
    stroke: 0.0095,
  },
  {
    id: "instrument",
    name: "Instrument Serif",
    note: "Elegant high-contrast serif, narrow and tall.",
    family: '"Instrument Serif"',
    file: "instrument",
    weight: 400,
    tracking: 0.015,
    stroke: 0.0095,
  },
  {
    id: "cormorant",
    name: "Cormorant Garamond",
    note: "Calligraphic serif — the Andante register. The lightest silhouette here.",
    family: '"Cormorant Garamond"',
    file: "cormorant",
    weight: 700,
    tracking: 0.015,
    stroke: 0.0090,
  },
];

export const DEFAULT_FACE = MARK_FACES[0]!;

export function faceById(id: string): MarkFace | undefined {
  return MARK_FACES.find((f) => f.id === id);
}
