import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { FieldProvider } from "@/components/field-provider";
import { SiteHeader } from "@/components/site-header";
import { PROFILE } from "@/content/profile";
import { PROJECTS } from "@/lib/projects";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://rossgibson.dev"),
  title: {
    default: `${PROFILE.name} — ${PROFILE.tagline}`,
    template: `%s — ${PROFILE.name}`,
  },
  description: PROFILE.tagline,
  openGraph: {
    title: PROFILE.name,
    description: PROFILE.tagline,
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-ink text-text">
        <FieldProvider projects={PROJECTS}>
          <SiteHeader />
          <main className="relative z-10">{children}</main>
        </FieldProvider>
      </body>
    </html>
  );
}
