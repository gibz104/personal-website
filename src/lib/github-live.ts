/**
 * Live repository counts, read from the public GitHub API at request time.
 *
 * `src/data/projects.json` is a snapshot taken by `npm run sync`, so the star
 * counts in it are only as fresh as the last time that ran. This tops them up
 * without a rebuild.
 *
 * No credentials are required: every field read here is public. GITHUB_TOKEN is
 * used when it happens to be set, and only for the rate limit, which is 60
 * requests an hour per IP anonymously against 5,000 with a token. One request
 * an hour shared across every visitor fits either budget comfortably; the token
 * buys immunity from whoever else is behind the same shared host IP.
 */
const ENDPOINT = "https://api.github.com/users/gibz104/repos?per_page=100";

/**
 * How long a fetched set is served before a request refreshes it.
 *
 * Revalidation is lazy, so this is a floor rather than a schedule: with no
 * traffic nothing refreshes, and the visitor who crosses the boundary still
 * sees the old page while the new one is built behind them.
 */
export const REVALIDATE_SECONDS = 3600;

export type LiveRepo = { stars: number; language: string | null };

type RawRepo = { name: string; stargazers_count: number; language: string | null };

/**
 * Whether a failure here has a previously rendered page to fall back on.
 *
 * During a build there is none, so a failure has to degrade to the committed
 * snapshot: a deploy must not depend on GitHub being up. Once the site is
 * serving there is always a page from the last successful render, and Next
 * keeps serving it when a revalidation throws. So at runtime the right move is
 * to throw and let it hold the good page, rather than to succeed with worse
 * data and have that overwrite it. `next dev` has no such cache, so it degrades
 * too rather than showing an error overlay.
 */
function hasCachedPage(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  );
}

/**
 * Stars and language per repository name.
 *
 * Throws when a page already exists to fall back on, and returns an empty map
 * when one does not; the caller reads empty as "use the committed snapshot".
 */
export async function liveRepoStats(): Promise<Map<string, LiveRepo>> {
  try {
    const response = await fetch(ENDPOINT, {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "rossgibson.dev",
        ...(process.env.GITHUB_TOKEN
          ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!response.ok) throw new Error(`GitHub answered ${response.status}`);

    const body: unknown = await response.json();
    if (!Array.isArray(body)) throw new Error("GitHub returned an unexpected shape");

    return new Map(
      (body as RawRepo[]).map((repo) => [
        repo.name,
        { stars: repo.stargazers_count, language: repo.language },
      ]),
    );
  } catch (error) {
    // Worth a line either way: silent to visitors is the point, but silent to
    // everyone is how a page stays stale for a month without anyone noticing.
    if (hasCachedPage()) {
      console.warn("[projects] GitHub refresh failed; holding the last good page", error);
      throw error;
    }
    console.warn("[projects] GitHub refresh failed; using the committed snapshot", error);
    return new Map();
  }
}
