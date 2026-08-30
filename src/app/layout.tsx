import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PROFILE } from "@/content/profile";
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
  twitter: {
    card: "summary_large_image",
    title: PROFILE.name,
    description: PROFILE.tagline,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full overflow-hidden bg-ink text-text">
        {children}
      </body>
    </html>
  );
}
