import { HeroCanvas } from "@/components/hero-canvas";
import { PROFILE } from "@/content/profile";

export default function HomePage() {
  return (
    <>
      <HeroCanvas variant="flare" />

      {/*
        The canvas is decorative and marked aria-hidden, so the page still owes
        assistive technology and crawlers a real heading. It is positioned off
        screen rather than display:none, which would take it out of the
        accessibility tree along with everything else.
      */}
      <h1 className="sr-only">
        {PROFILE.name} — {PROFILE.tagline}
      </h1>
    </>
  );
}
