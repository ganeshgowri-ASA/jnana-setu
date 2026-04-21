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
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-50">Whitelisted sources</h1>
      <p className="mt-3 max-w-3xl text-slate-300">
        These are the only domains jnana-setu will ever link to. The list lives
        in{" "}
        <code className="rounded bg-slate-800 px-1.5 py-0.5 text-sm text-slate-200">
          sources.yaml
        </code>{" "}
        and is enforced from two sides:{" "}
        <code className="rounded bg-slate-800 px-1.5 py-0.5 text-sm text-slate-200">
          scripts/quality_check.ts
        </code>{" "}
        rejects any catalog entry whose URL doesn't begin with one of the
        declared <code>base_urls</code>, and the Python scrapers call{" "}
        <code className="rounded bg-slate-800 px-1.5 py-0.5 text-sm text-slate-200">
          base.assert_whitelisted()
        </code>{" "}
        before every HTTP request.
      </p>

      <div className="mt-8 overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Publisher</th>
              <th className="px-4 py-3">Default license</th>
              <th className="px-4 py-3">Whitelisted base URLs</th>
              <th className="px-4 py-3 text-right">Entries</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {catalog.sources.map((source) => (
              <tr key={source.id} className="align-top">
                <td className="px-4 py-4">
                  <a
                    href={source.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-saffron hover:underline"
                  >
                    {source.name}
                  </a>
                  {source.notes ? (
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      {source.notes}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-4 text-slate-300">{source.publisher}</td>
                <td className="px-4 py-4">
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                    {licenseLabel(source.default_license)}
                  </span>
                </td>
                <td className="px-4 py-4 text-xs text-slate-400">
                  <ul className="space-y-1">
                    {source.base_urls.map((u) => (
                      <li key={u} className="font-mono">{u}</li>
                    ))}
                  </ul>
                </td>
                <td className="px-4 py-4 text-right tabular-nums text-slate-300">
                  {counts.get(source.id) ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
