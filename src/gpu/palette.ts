/**
 * One artwork, not a rainbow: cool blues carry the field and warm accents mark
 * the systems work. Values are linear-ish HDR emissive, so they bloom.
 */
const LANGUAGE_COLORS: Record<string, readonly [number, number, number]> = {
  Rust: [1.0, 0.44, 0.17],
  TypeScript: [0.30, 0.72, 1.0],
  JavaScript: [1.0, 0.82, 0.36],
  Python: [0.42, 0.92, 0.74],
  "C++": [0.78, 0.46, 1.0],
  C: [0.78, 0.46, 1.0],
  Shell: [0.55, 0.85, 0.70],
  Dockerfile: [0.40, 0.66, 0.95],
  HTML: [1.0, 0.55, 0.40],
  CSS: [0.52, 0.62, 1.0],
  "C#": [0.62, 0.50, 1.0],
  Vyper: [0.45, 0.95, 0.80],
  CMake: [0.70, 0.75, 0.85],
  Makefile: [0.70, 0.75, 0.85],
};

export const DEFAULT_COLOR = [0.60, 0.73, 0.96] as const;

export function languageColor(
  language: string | null,
): readonly [number, number, number] {
  if (!language) return DEFAULT_COLOR;
  return LANGUAGE_COLORS[language] ?? DEFAULT_COLOR;
}

/** CSS hex for the same colour, for UI that has to agree with the canvas. */
export function languageCss(language: string | null): string {
  const [r, g, b] = languageColor(language);
  const to = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
