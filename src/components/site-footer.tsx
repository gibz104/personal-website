import { PROFILE } from "@/content/profile";
import { SYNCED_AT } from "@/lib/projects";

export function SiteFooter() {
  const synced = new Date(SYNCED_AT).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <footer className="border-t border-line px-6 py-10 sm:px-10">
      <div className="mx-auto flex max-w-[104rem] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="tag">
          {PROFILE.name} · {PROFILE.location}
        </p>
        <div className="flex items-center gap-6">
          {PROFILE.links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="tag transition-colors hover:text-muted"
            >
              {link.label} ↗
            </a>
          ))}
          <p className="tag">Synced {synced}</p>
        </div>
      </div>
    </footer>
  );
}
