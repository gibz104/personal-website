import Link from "next/link";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-ink px-6">
      <div className="max-w-md text-center">
        <p className="tag">404</p>
        <h1 className="mt-5 text-3xl font-medium tracking-tight">
          Nothing at this coordinate.
        </h1>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full border border-line-strong px-6 py-2.5 text-sm transition-colors hover:border-white/30 hover:bg-white/[0.04]"
        >
          Back
        </Link>
      </div>
    </main>
  );
}
