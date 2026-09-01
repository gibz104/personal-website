"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SocialLinks } from "./social-links";

const LINKS = [
  { href: "/work", label: "Work" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
] as const;

/**
 * Navigation that stays out of the way of the artwork.
 *
 * On the home page nothing is drawn until the visitor does something — moves a
 * pointer, touches, scrolls, or simply waits a couple of seconds. The first
 * impression is the scene alone, and the way out appears the moment there is
 * someone there to want it. Everywhere else it is present immediately, because
 * by then it is the thing being used rather than the thing being interrupted.
 */
export function SiteNav() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  // Engagement is sticky, not per-route: once someone has arrived, coming back
  // to the home page should not hide the way out again.
  const [engaged, setEngaged] = useState(false);
  const revealed = !isHome || engaged;

  useEffect(() => {
    if (!isHome) return;

    const show = () => setEngaged(true);
    const timer = window.setTimeout(show, 2400);
    window.addEventListener("pointermove", show, { once: true, passive: true });
    window.addEventListener("touchstart", show, { once: true, passive: true });
    window.addEventListener("scroll", show, { once: true, passive: true });
    window.addEventListener("keydown", show, { once: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", show);
      window.removeEventListener("touchstart", show);
      window.removeEventListener("scroll", show);
      window.removeEventListener("keydown", show);
    };
  }, [isHome]);

  return (
    <header
      // Top right on every route. Moving it between pages made the one thing a
      // visitor had just learned the location of change position underneath
      // them, which is a bad trade for a slightly cleaner first frame.
      className={`pointer-events-none fixed inset-x-0 top-0 z-30 transition-opacity duration-1000 ${
        revealed ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="mx-auto flex max-w-[104rem] items-center justify-between gap-6 px-5 py-5 sm:px-8">
        {isHome ? (
          <span />
        ) : (
          <Link
            href="/"
            aria-label="Home"
            className="over-field pointer-events-auto font-mono text-sm font-semibold tracking-[0.12em] text-muted transition-colors hover:text-text"
          >
            RG
          </Link>
        )}

        <nav className="over-field pointer-events-auto flex items-center gap-1">
          {LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 font-mono text-[0.6875rem] tracking-[0.16em] uppercase transition-colors ${
                  active ? "text-text" : "text-dim hover:text-muted"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <SocialLinks className="ml-1 pointer-events-auto" />
        </nav>
      </div>
    </header>
  );
}
