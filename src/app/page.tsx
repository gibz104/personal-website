import { Presence } from "@/components/presence";
import { PROFILE } from "@/content/profile";

export default function HomePage() {
  return (
    <>
      <Presence value={1} />

      {/*
        The scene is the page. The canvas is decorative and marked aria-hidden,
        so this heading is what assistive technology and crawlers read; it is
        positioned off screen rather than hidden, which would remove it from the
        accessibility tree along with everything else.
      */}
      <h1 className="sr-only">
        {PROFILE.name} — {PROFILE.tagline}
      </h1>
    </>
  );
}
