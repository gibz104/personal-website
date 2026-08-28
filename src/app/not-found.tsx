import Link from "next/link";
import { Scene } from "@/components/scene";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <>
      <Scene name="calm" />
      <div aria-hidden className="reading-scrim pointer-events-none fixed inset-0 z-0" />

      <section className="relative z-10 flex min-h-svh items-center px-6 sm:px-10">
        <div className="mx-auto w-full max-w-[104rem]">
          <div className="max-w-xl">
            <p className="tag">404</p>
            <h1 className="mt-6 text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.05] tracking-[-0.03em]">
              Nothing at this coordinate.
            </h1>
            <p className="mt-5 text-[1.0625rem] leading-relaxed text-muted">
              The field is still out there. This particular body is not.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/work"
                className="rounded-full border border-line-strong px-6 py-2.5 text-sm transition-colors hover:border-white/30 hover:bg-white/[0.04]"
              >
                Back to the field
              </Link>
              <Link
                href="/"
                className="rounded-full border border-line px-6 py-2.5 text-sm text-muted transition-colors hover:border-line-strong hover:text-text"
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
