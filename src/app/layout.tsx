import type { Metadata } from "next";
import { Suspense } from "react";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "jnana-setu · ज्ञानसेतु — Bridge of Knowledge",
    template: "%s · jnana-setu",
  },
  description:
    "Open-access catalog and searchable web app for Electrical Engineering and GATE study material. Indexes only legally-free and openly-licensed resources.",
  keywords: [
    "GATE",
    "EEE",
    "Electrical Engineering",
    "NPTEL",
    "MIT OCW",
    "OpenStax",
    "LibreTexts",
    "open education",
  ],
  openGraph: {
    type: "website",
    title: "jnana-setu — Bridge of Knowledge",
    description:
      "A legal, open-access catalog of EEE / GATE study material, linking only to free and openly-licensed resources.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <Suspense>{children}</Suspense>
        </main>
        <Footer />
      </body>
    </html>
  );
}
