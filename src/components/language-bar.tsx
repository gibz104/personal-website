import { languageCss } from "@/gpu/palette";
import type { Language } from "@/lib/projects";

/** Composition bar: the same colours the field uses for this project's bodies. */
export function LanguageBar({ languages }: { languages: Language[] }) {
  const shown = languages.filter((l) => l.pct > 0.005).slice(0, 6);
  if (shown.length === 0) return null;

  return (
    <div>
      <div className="flex h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
        {shown.map((lang) => (
          <span
            key={lang.name}
            className="h-full"
            style={{ width: `${lang.pct * 100}%`, background: languageCss(lang.name) }}
          />
        ))}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {shown.map((lang) => (
          <li key={lang.name} className="flex items-center gap-2">
            <span
              className="size-1.5 rounded-full"
              style={{ background: languageCss(lang.name) }}
            />
            <span className="font-mono text-[0.6875rem] tracking-[0.1em] text-muted">
              {lang.name}
            </span>
            <span className="font-mono text-[0.6875rem] tabular-nums text-dim">
              {(lang.pct * 100).toFixed(lang.pct < 0.1 ? 1 : 0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
