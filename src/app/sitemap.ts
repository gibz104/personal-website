import type { MetadataRoute } from "next";
import { SITE_URL } from "@/content/site";

/**
 * Four routes, listed by how often they actually change.
 *
 * `lastModified` is the build time rather than a hand-kept date: every deploy
 * is the only moment any of this content can have changed, so the two are the
 * same thing and only one of them can go stale.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/work`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/projects`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
  ];
}
