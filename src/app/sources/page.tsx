import { getCatalog } from "@/lib/catalog";
import { licenseLabel } from "@/lib/licenses";

export const metadata = { title: "Sources" };

export default async function SourcesPage() {
  const catalog = await getCatalog();
  const counts = new Map<string, number>();
  for (const r of catalog.resources) {
    counts.set(r.sourceId, (counts.get(r.sourceId) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold text-ink">Trusted sources</h1>
      <p className="mt-2 text-slate-700">
        Every resource in jnana-setu comes from one of these vetted providers.
        We only index content that the provider itself has released under a
        permissive license or made officially free.
      </p>

      <div className="mt-6 space-y-4">
        {catalog.sources.map((source) => (
          <div
            key={source.id}
            className="rounded-lg border border-slate-200 bg-white p-5"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-ink">{source.name}</h2>
              <span className="text-xs text-slate-500">
                {counts.get(source.id) ?? 0} resources
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">{source.publisher}</p>
            <p className="mt-2 text-sm text-slate-700">{source.notes}</p>
            <div className="mt-3 flex items-center gap-4 text-sm">
              <a
                href={source.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-saffron hover:underline"
              >
                {source.homepage}
              </a>
              <span className="text-slate-500">
                Default license: {licenseLabel(source.defaultLicense)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
