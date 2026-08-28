"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PROFILE } from "@/content/profile";

const NAV = [
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  // Content scrolls under the fixed header, so it needs a backdrop as soon as
  // anything is behind it — otherwise headings collide with the nav.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`pointer-events-none fixed inset-x-0 top-0 z-30 transition-colors duration-300 ${
        scrolled
          ? "border-b border-line bg-ink/80 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-[104rem] items-center justify-between gap-4 px-5 py-4 sm:px-10 sm:py-5">
        <Link
          href="/"
          className="pointer-events-auto group flex shrink-0 items-baseline gap-2.5"
        >
          <span className="whitespace-nowrap text-[0.9375rem] font-medium tracking-tight">
            {PROFILE.name}
          </span>
          <span className="hidden font-mono text-[0.6875rem] tracking-[0.16em] text-dim transition-colors group-hover:text-muted sm:inline">
            {PROFILE.handle}
          </span>
        </Link>

        <nav className="pointer-events-auto flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-2.5 py-1.5 font-mono text-[0.6875rem] tracking-[0.16em] uppercase transition-colors sm:px-3.5 ${
                  active
                    ? "bg-white/[0.07] text-text"
                    : "text-dim hover:text-muted"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <a
            href={PROFILE.links[0].href}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-full px-3.5 py-1.5 font-mono text-[0.6875rem] tracking-[0.16em] uppercase text-dim transition-colors hover:text-muted sm:ml-1 sm:inline-block"
          >
            GitHub ↗
          </a>
        </nav>
      </div>
    </header>
  );
}
