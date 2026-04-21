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
      <h1 className="text-3xl font-bold">Whitelisted sources</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        These are the only domains jnana-setu will link to. The list is
        enforced by{" "}
        <code className="rounded bg-slate-200 px-1 py-0.5 text-sm dark:bg-slate-800">
          sources.yaml
        </code>{" "}
        — URLs not starting with one of the listed <code>base_urls</code> fail
        both <code>scripts/quality_check.ts</code> and the scrapers'{" "}
        <code>assert_whitelisted()</code> call.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <tr>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Publisher</th>
              <th className="px-4 py-3">Default license</th>
              <th className="px-4 py-3">Whitelisted base URLs</th>
              <th className="px-4 py-3 text-right">Entries</th>
            </tr>
          </thead>
          <tbody>
            {catalog.sources.map((source) => (
              <tr
                key={source.id}
                className="border-t border-slate-200 align-top dark:border-slate-700"
              >
                <td className="px-4 py-3">
                  <a
                    href={source.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-saffron hover:underline"
                  >
                    {source.name}
                  </a>
                  {source.notes ? (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {source.notes}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                  {source.publisher}
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                  {licenseLabel(source.default_license)}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                  <ul className="space-y-1">
                    {source.base_urls.map((u) => (
                      <li key={u} className="font-mono">{u}</li>
                    ))}
                  </ul>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
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
