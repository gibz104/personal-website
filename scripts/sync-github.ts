/**
 * Pulls the GitHub profile + repositories into src/data/projects.json.
 *
 * Run with `npm run sync`. The result is committed, so the site never depends
 * on the GitHub API at build or request time.
 *
 * Auth: uses GITHUB_TOKEN when set, otherwise falls back to `gh auth token`.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { CURATION } from "../src/content/curation";

const USER = "gibz104";
const OUT = new URL("../src/data/projects.json", import.meta.url);

function token(): string | undefined {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
  } catch {
    return undefined;
  }
}

const TOKEN = token();

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "gibz-site-sync",
      ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

/** README markdown, or "" when the repo has none. */
async function readme(name: string): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/${USER}/${name}/readme`,
    {
      headers: {
        accept: "application/vnd.github.raw",
        "user-agent": "gibz-site-sync",
        ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
      },
    },
  );
  return res.ok ? res.text() : "";
}

/**
 * READMEs are written for GitHub: badges, inline HTML, screenshots, nested
 * code fences. Rendering that verbatim on a designed page looks like a bug, so
 * the useful prose is extracted here, once, at sync time.
 */
function cleanReadme(markdown: string): { summary: string; highlights: string[] } {
  const body = markdown
    .replace(/^---[\s\S]*?---/, "")            // front matter
    .replace(/```[\s\S]*?```/g, "")            // fenced code
    .replace(/<!--[\s\S]*?-->/g, "")           // comments
    .replace(/<[^>]+>/g, "")                    // inline HTML
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, "") // badge links
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")      // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")   // links -> their text
    .replace(/\*\*|__/g, "")                    // bold markers
    .replace(/`/g, "");                         // inline code ticks

  const lines = body.split("\n");

  const paragraphs: string[] = [];
  let buffer: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    const isProse =
      line &&
      !line.startsWith("#") &&
      !line.startsWith("|") &&
      !line.startsWith(">") &&
      !/^[-*+]\s/.test(line) &&
      !/^\d+\.\s/.test(line);
    if (isProse) {
      buffer.push(line);
    } else if (buffer.length) {
      paragraphs.push(buffer.join(" "));
      buffer = [];
    }
  }
  if (buffer.length) paragraphs.push(buffer.join(" "));

  const summary = paragraphs
    .filter((p) => p.length > 60)
    .slice(0, 2)
    .join(" ")
    .replace(/\s+/g, " ")
    .slice(0, 480)
    .trim();

  const highlights = lines
    .map((l) => l.trim())
    .filter((l) => /^[-*+]\s+\S/.test(l))
    .map((l) => l.replace(/^[-*+]\s+/, "").replace(/\*\*/g, "").replace(/`/g, "").trim())
    .filter((l) => l.length > 24 && l.length < 190 && !l.startsWith("http"))
    .slice(0, 6);

  return { summary, highlights };
}

type RawRepo = {
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  fork: boolean;
  archived: boolean;
  size: number;
};

async function main() {
  const profile = await api<Record<string, unknown>>(`/users/${USER}`);
  const repos: RawRepo[] = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await api<RawRepo[]>(
      `/users/${USER}/repos?per_page=100&page=${page}&sort=pushed`,
    );
    repos.push(...batch);
    if (batch.length < 100) break;
  }

  const kept = repos.filter((r) => {
    if ((CURATION.hidden as readonly string[]).includes(r.name)) return false;
    if (r.fork && !(CURATION.featured as readonly string[]).includes(r.name)) return false;
    // Drop stubs: no description, no stars, and essentially no code.
    if (!r.description && r.stargazers_count === 0 && r.size < 40) return false;
    return true;
  });

  const projects = await Promise.all(
    kept.map(async (r) => {
      const languages = await api<Record<string, number>>(
        `/repos/${USER}/${r.name}/languages`,
      );
      const total = Object.values(languages).reduce((a, b) => a + b, 0) || 1;
      const override: Partial<{ title: string; tagline: string; blurb: string; category: string }> =
        (CURATION.overrides as Record<string, { title?: string; tagline?: string; blurb?: string; category?: string }>)[r.name] ?? {};
      const featuredIndex = (CURATION.featured as readonly string[]).indexOf(r.name);

      return {
        name: r.name,
        slug: r.name.toLowerCase(),
        title: override.title ?? r.name,
        tagline: override.tagline ?? r.description ?? "",
        blurb: override.blurb ?? null,
        url: r.html_url,
        homepage: r.homepage?.trim()
          ? r.homepage.startsWith("http")
            ? r.homepage
            : `https://${r.homepage}`
          : null,
        language: r.language,
        languages: Object.entries(languages)
          .map(([nm, size]) => ({ name: nm, size, pct: size / total }))
          .sort((a, b) => b.size - a.size),
        stars: r.stargazers_count,
        forks: r.forks_count,
        topics: r.topics ?? [],
        category: override.category ?? inferCategory(r),
        createdAt: r.created_at,
        pushedAt: r.pushed_at,
        isFork: r.fork,
        archived: r.archived,
        featured: featuredIndex >= 0,
        order: featuredIndex >= 0 ? featuredIndex : 999,
        ...cleanReadme(await readme(r.name)),
      };
    }),
  );

  projects.sort(
    (a, b) => a.order - b.order || b.stars - a.stars ||
      +new Date(b.pushedAt) - +new Date(a.pushedAt),
  );

  mkdirSync(new URL(".", OUT), { recursive: true });
  writeFileSync(
    OUT,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        profile: {
          login: profile.login,
          name: profile.name,
          avatar: profile.avatar_url,
          location: profile.location,
          followers: profile.followers,
          createdAt: profile.created_at,
        },
        projects,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `wrote ${projects.length} projects (${projects.filter((p) => p.featured).length} featured)`,
  );
}

function inferCategory(r: RawRepo): string {
  const hay = `${r.name} ${r.description ?? ""} ${r.topics.join(" ")}`.toLowerCase();
  if (/(eth|reth|web3|zksync|mev|nft|blockchain|defi|cryo)/.test(hay)) return "onchain";
  if (/(esp32|arduino|firmware|iot|home-assistant|hacs|sensor|printer|bambu|spool|ota|mqtt|thread)/.test(hay))
    return "hardware";
  if (/(tableau|viz|chart|dashboard|infographic|standings|analytics)/.test(hay)) return "viz";
  return "tools";
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
