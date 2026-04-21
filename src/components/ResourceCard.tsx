import Link from "next/link";

import type { Resource, Source } from "@data/schema";
import { licenseHref, licenseLabel } from "@/lib/licenses";

interface Props {
  resource: Resource;
  source: Source | undefined;
}

export function ResourceCard({ resource, source }: Props) {
  const licenseUrl = licenseHref(resource.license, resource.licenseUrl);

  return (
    <article className="flex flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-saffron hover:shadow-md">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
        <span className="rounded bg-slate-100 px-2 py-0.5">{source?.name ?? resource.sourceId}</span>
        <span className="rounded bg-parchment px-2 py-0.5 text-ink">{resource.level}</span>
        {resource.media.map((m) => (
          <span key={m} className="rounded bg-slate-100 px-2 py-0.5">{m}</span>
        ))}
      </div>
      <h3 className="text-lg font-semibold text-ink">
        <Link href={`/resource/${resource.id}`} className="hover:text-saffron">
          {resource.title}
        </Link>
      </h3>
      {resource.authors.length > 0 ? (
        <p className="mt-1 text-sm text-slate-600">
          {resource.authors.join(", ")}
          {resource.institution ? ` — ${resource.institution}` : ""}
        </p>
      ) : resource.institution ? (
        <p className="mt-1 text-sm text-slate-600">{resource.institution}</p>
      ) : null}
      <p className="mt-3 flex-1 text-sm text-slate-700">{resource.description}</p>
      <div className="mt-4 flex items-center justify-between text-xs">
        {licenseUrl ? (
          <a
            href={licenseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 hover:text-saffron"
          >
            License: {licenseLabel(resource.license)}
          </a>
        ) : (
          <span className="text-slate-600">License: {licenseLabel(resource.license)}</span>
        )}
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-saffron hover:underline"
        >
          Open ↗
        </a>
      </div>
    </article>
  );
}
