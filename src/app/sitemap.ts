import type { MetadataRoute } from "next";

import { getCatalog } from "@/lib/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const catalog = await getCatalog();
  const now = new Date();

  return [
    { url: `${base}/`, lastModified: now },
    { url: `${base}/subjects`, lastModified: now },
    { url: `${base}/sources`, lastModified: now },
    { url: `${base}/about`, lastModified: now },
    { url: `${base}/licensing`, lastModified: now },
    ...catalog.subjects.map((s) => ({
      url: `${base}/subjects/${s.slug}`,
      lastModified: now,
    })),
    ...catalog.resources.map((r) => ({
      url: `${base}/resource/${r.id}`,
      lastModified: now,
    })),
  ];
}
