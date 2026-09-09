import type { MetadataRoute } from "next";
import { SITE_URL } from "@/content/site";

/**
 * Everything here is meant to be read, by people and by machines alike.
 *
 * The assistant crawlers are named explicitly rather than left to the wildcard.
 * They already match `*`, so this changes nothing technically; it states the
 * intent, so that a later "block the scrapers" reflex has to be a deliberate
 * edit rather than a default nobody chose.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      {
        userAgent: [
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "ClaudeBot",
          "Claude-User",
          "PerplexityBot",
          "Google-Extended",
          "Applebot-Extended",
          "CCBot",
        ],
        allow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
