import data from "@/data/projects.json";
import { CURATION, type ManualProject, type ProjectLink } from "@/content/curation";
import { liveRepoStats } from "./github-live";

export type { ProjectLink };

export type Language = { name: string; size: number; pct: number };

export type Project = {
  name: string;
  slug: string;
  title: string;
  tagline: string;
  blurb: string | null;
  url: string;
  homepage: string | null;
  language: string | null;
  languages: Language[];
  stars: number;
  forks: number;
  topics: string[];
  category: "onchain" | "hardware" | "viz" | "tools";
  createdAt: string;
  pushedAt: string;
  isFork: boolean;
  archived: boolean;
  featured: boolean;
  order: number;
  summary: string;
  highlights: string[];
};

export type Profile = {
  login: string;
  name: string;
  avatar: string;
  location: string;
  followers: number;
  createdAt: string;
};

export const PROJECTS = data.projects as Project[];
export const GITHUB_PROFILE = data.profile as Profile;
export const SYNCED_AT = data.generatedAt as string;

/**
 * One row of the Projects page.
 *
 * Flattened from two sources that will never share a shape: the synced GitHub
 * data, and the hand-written entries for work that has no public repository.
 * Components read this, so neither of those leaks into a component.
 */
export type ListedProject = {
  id: string;
  /**
   * GitHub repository name, or null for the projects it has never heard of.
   * This is what live counts are matched on, so it is the repository's real
   * name rather than the slug or the display title.
   */
  repo: string | null;
  title: string;
  tagline: string;
  /** Where the title points — the repository, or the running thing when there is none. */
  url: string;
  /** Null only when nothing knows it; the category is shown in that slot instead. */
  language: string | null;
  /** Null without a repository, which is different from a repository with none. */
  stars: number | null;
  category: Project["category"];
  /**
   * Where else this project lives. Not its source: the title is the link to
   * that, so repeating it here would be two controls doing one job.
   */
  links: ProjectLink[];
};

const BY_NAME = new Map(PROJECTS.map((p) => [p.name, p]));
// Typed wide on purpose: `as const` in curation.ts narrows every string to a
// literal, and a map keyed by nine literal names cannot be queried by a name
// that came from somewhere else.
const MANUAL = new Map<string, ManualProject>(CURATION.manual.map((m) => [m.name, m]));

type Override = {
  title?: string;
  tagline?: string;
  category?: Project["category"];
  links?: readonly ProjectLink[];
};

/**
 * The editorial layer for one repository, read at import time.
 *
 * `sync-github.ts` also folds these into projects.json, but reading them here
 * as well is what lets a wording change take effect without a re-sync. The
 * JSON stays the record of what GitHub said; curation.ts stays the record of
 * what we say about it, and the second wins.
 */
function override(name: string): Override {
  return (CURATION.overrides as Record<string, Override>)[name] ?? {};
}

/**
 * The Projects page, in order.
 *
 * Built from `CURATION.featured` rather than from the `featured` and `order`
 * fields baked into projects.json. Those are a cache of the last GitHub sync,
 * and re-ordering the page should not require re-running one — nor should the
 * page silently disagree with the list that is meant to control it. A name
 * matching neither a repository nor a manual entry is dropped rather than
 * rendered as a hole.
 */
export const LISTED: ListedProject[] = CURATION.featured.flatMap<ListedProject>((name) => {
  const manual = MANUAL.get(name);
  if (manual) {
    return [
      {
        id: manual.name,
        repo: null,
        title: manual.title,
        tagline: manual.tagline,
        url: manual.url,
        language: manual.language,
        stars: null,
        category: manual.category,
        links: [...(manual.links ?? [])],
      },
    ];
  }

  const repo = BY_NAME.get(name);
  if (!repo) return [];
  const edit = override(name);
  return [
    {
      id: repo.slug,
      repo: repo.name,
      title: edit.title ?? repo.title,
      tagline: edit.tagline ?? repo.tagline,
      url: repo.url,
      language: repo.language,
      stars: repo.stars,
      category: edit.category ?? repo.category,
      links: [...(edit.links ?? [])],
    },
  ];
});

export function projectBySlug(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}

export const CATEGORY_LABEL: Record<Project["category"], string> = {
  onchain: "Onchain",
  hardware: "Hardware",
  viz: "Visualization",
  tools: "Tools",
};

/** Total stars across everything shown. */
export const TOTAL_STARS = PROJECTS.reduce((sum, p) => sum + p.stars, 0);

/**
 * The Projects page with current star counts.
 *
 * `LISTED` is the floor: everything editorial, plus whatever the last sync
 * recorded. This overlays the live numbers on top of it where GitHub answered,
 * and returns the floor untouched where it did not, so a rate-limited hour
 * costs the page nothing but freshness.
 *
 * Only repository-backed rows are touched. The manual entries have no
 * repository to have stars, and their language is stated in curation.ts
 * because nothing else knows it.
 */
export async function listedProjects(): Promise<ListedProject[]> {
  const live = await liveRepoStats();
  if (live.size === 0) return LISTED;

  return LISTED.map((project) => {
    const stats = project.repo ? live.get(project.repo) : undefined;
    if (!stats) return project;
    return {
      ...project,
      stars: stats.stars,
      // A repository with no detectable language reports null, which should not
      // wipe out a good value from the snapshot.
      language: stats.language ?? project.language,
    };
  });
}
