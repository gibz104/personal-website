import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SceneProvider } from "@/components/scene-provider";
import { SiteNav } from "@/components/site-nav";
import { PROFILE } from "@/content/profile";
import { SITE_URL } from "@/content/site";
import { personSchema, siteSchema } from "@/content/structured-data";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

/**
 * One sentence that has to work everywhere: the search result, the link
 * preview, and the answer an assistant gives about who this is. The tagline
 * alone said what field he is in but not what he does in it.
 */
const SUMMARY =
  `${PROFILE.name} works in data and analytics in ${PROFILE.location}. Nine ` +
  "years at Kraft Heinz from financial analyst to senior data engineer, and " +
  "now Finance Data and Analytics at Google.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${PROFILE.name} · ${PROFILE.tagline}`,
    template: `%s · ${PROFILE.name}`,
  },
  description: SUMMARY,
  applicationName: PROFILE.name,
  authors: [{ name: PROFILE.name, url: SITE_URL }],
  creator: PROFILE.name,
  publisher: PROFILE.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "profile",
    siteName: PROFILE.name,
    title: `${PROFILE.name} · ${PROFILE.tagline}`,
    description: SUMMARY,
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${PROFILE.name} · ${PROFILE.tagline}`,
    description: SUMMARY,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-ink text-text">
        {/* Stated rather than left to be inferred from the prose. Search
            engines and assistants both do better with the facts spelled out. */}
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([personSchema(), siteSchema()]),
          }}
        />
        <SceneProvider>
          <SiteNav />
          {children}
        </SceneProvider>
      </body>
    </html>
  );
}
