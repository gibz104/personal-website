/**
 * Accent per language, matching the colours the character board uses for its
 * syntax so the list and the artwork agree.
 */
const COLORS: Record<string, string> = {
  Python: "#6bebbd",
  TypeScript: "#52b8ff",
  JavaScript: "#ffd15c",
  Rust: "#ff752d",
  C: "#c77aff",
  "C++": "#c77aff",
  Shell: "#8cd9b3",
  HTML: "#ff8c66",
  CSS: "#8599ff",
  Dockerfile: "#66a8f2",
};

export const DEFAULT_ACCENT = "#8d97aa";

export function languageColor(language: string | null | undefined): string {
  return (language && COLORS[language]) || DEFAULT_ACCENT;
}
