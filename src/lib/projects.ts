import data from "@/data/projects.json";

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

export const FEATURED = PROJECTS.filter((p) => p.featured);

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
