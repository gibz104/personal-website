import { EXPERIENCE } from "./experience";
import { PROFILE } from "./profile";
import { SITE_URL } from "./site";

/**
 * Schema.org description of the person behind the site.
 *
 * Search engines and assistants both read this, and both do better with facts
 * stated plainly than with facts inferred from prose. Every value is derived
 * from the content files rather than written out again here, so a new job or a
 * changed tagline updates the markup by updating the page.
 */
export function personSchema() {
  const current = EXPERIENCE[0];
  const role = current?.roles[0];

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE_URL}/#person`,
    name: PROFILE.name,
    url: SITE_URL,
    image: `${SITE_URL}/portrait.jpg`,
    description: PROFILE.bio[0],
    jobTitle: role?.title,
    worksFor: current ? { "@type": "Organization", name: current.company } : undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: PROFILE.location,
      addressRegion: "IL",
      addressCountry: "US",
    },
    alumniOf: PROFILE.education.map((entry) => ({
      "@type": "CollegeOrUniversity",
      name: entry.school,
    })),
    hasCredential: PROFILE.certifications.map((entry) => ({
      "@type": "EducationalOccupationalCredential",
      name: entry.name,
      credentialCategory: "certification",
      recognizedBy: { "@type": "Organization", name: entry.issuer },
    })),
    knowsAbout: PROFILE.stack.flatMap((group) => group.items),
    sameAs: PROFILE.links.map((link) => link.href),
  };
}

/** The site itself, so a result can be attributed to its author. */
export function siteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: `${PROFILE.name} · ${PROFILE.tagline}`,
    description: PROFILE.bio[0],
    inLanguage: "en-US",
    author: { "@id": `${SITE_URL}/#person` },
  };
}
