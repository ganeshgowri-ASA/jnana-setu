import Link from "next/link";

import { ResourceCard } from "@/components/ResourceCard";
import { SearchBar } from "@/components/SearchBar";
import { SubjectTile } from "@/components/SubjectTile";
import { getCatalog } from "@/lib/catalog";
import { buildSearchIndex, searchCatalog } from "@/lib/search";

export const revalidate = 3600;

interface PageProps {
  searchParams?: {
    q?: string;
    subject?: string;
    source?: string;
    media?: string;
    level?: string;
  };
}

export default async function HomePage({ searchParams = {} }: PageProps) {
  const catalog = await getCatalog();
  const query = searchParams.q?.trim() ?? "";
  const index = buildSearchIndex(catalog.resources);
  const results = searchCatalog(index, catalog.resources, query, {
    subject: searchParams.subject,
    sourceId: searchParams.source,
    media: searchParams.media,
    level: searchParams.level,
  });

  const counts = subjectCounts(catalog.resources);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="mb-8">
        <h1 className="font-devanagari text-4xl font-bold text-ink md:text-5xl">
          ज्ञानसेतु
        </h1>
        <p className="mt-2 text-lg text-slate-700">
          A bridge to <strong>legally free</strong> study material for Electrical
          Engineering and GATE aspirants.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {catalog.resources.length} resources · {catalog.sources.length} trusted sources · {catalog.subjects.length} subjects
        </p>
        <div className="mt-6 max-w-2xl">
          <SearchBar initialQuery={query} />
        </div>
      </section>

      {query ? (
        <section>
          <h2 className="mb-4 text-xl font-semibold text-ink">
            Results for “{query}”
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({results.length})
            </span>
          </h2>
          {results.length === 0 ? (
            <p className="text-slate-600">
              No matches. Try a shorter phrase or browse by subject below.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {results.map(({ resource }) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  source={catalog.sources.find((s) => s.id === resource.sourceId)}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="mb-10">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-xl font-semibold text-ink">Browse by subject</h2>
              <Link href="/subjects" className="text-sm text-saffron hover:underline">
                All subjects →
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {catalog.subjects.slice(0, 6).map((subject) => (
                <SubjectTile
                  key={subject.slug}
                  subject={subject}
                  count={counts.get(subject.slug) ?? 0}
                />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-xl font-semibold text-ink">Featured resources</h2>
              <Link href="/sources" className="text-sm text-saffron hover:underline">
                All sources →
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {catalog.resources.slice(0, 6).map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  source={catalog.sources.find((s) => s.id === resource.sourceId)}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function subjectCounts(
  resources: Awaited<ReturnType<typeof getCatalog>>["resources"],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of resources) {
    for (const s of r.subjects) {
      map.set(s, (map.get(s) ?? 0) + 1);
    }
  }
  return map;
}
