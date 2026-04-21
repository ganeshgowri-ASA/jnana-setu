import { NextResponse } from "next/server";

import { getCatalog } from "@/lib/catalog";
import { buildSearchIndex, searchCatalog } from "@/lib/search";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const subject = searchParams.get("subject") ?? undefined;
  const sourceId = searchParams.get("source") ?? undefined;
  const media = searchParams.get("media") ?? undefined;
  const level = searchParams.get("level") ?? undefined;
  const limit = clampInt(searchParams.get("limit"), 1, 100, 25);

  const catalog = await getCatalog();
  const index = buildSearchIndex(catalog.resources);
  const results = searchCatalog(
    index,
    catalog.resources,
    query,
    { subject, sourceId, media, level },
    limit,
  );

  return NextResponse.json(
    {
      query,
      count: results.length,
      results: results.map(({ resource, score }) => ({
        id: resource.id,
        title: resource.title,
        url: resource.url,
        sourceId: resource.sourceId,
        subjects: resource.subjects,
        media: resource.media,
        level: resource.level,
        license: resource.license,
        score,
      })),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}

function clampInt(raw: string | null, min: number, max: number, fallback: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
