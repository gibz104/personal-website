/**
 * Display faces the monogram can be set in.
 *
 * Six of the eight faces originally shortlisted — Andante, Sublima, Bradley
 * Sans, Sovana, Anona and IvyPresto — are commercial licences that cannot be
 * fetched, and Bricolage Grotesk is on the Google Fonts site but is not served
 * by its API. What is here is the one that was available plus free faces that
 * occupy the same registers, so the choice can still be made by eye.
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
    id: "arial-black",
    name: "Arial Black",
    note: "The current mark. Heaviest silhouette, most light blocked.",
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
    id: "archivo",
    name: "Archivo",
    note: "Sturdy utilitarian grotesk — Bricolage's plainer side.",
    family: '"Archivo"',
    file: "archivo",
    weight: 800,
    tracking: 0.040,
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
