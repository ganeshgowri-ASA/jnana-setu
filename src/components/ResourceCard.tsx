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
    <article className="group flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm transition hover:border-saffron hover:shadow-lg">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">
          {source?.name ?? resource.sourceId}
        </span>
        <span className="rounded-full bg-saffron/15 px-2 py-0.5 text-saffron">
          {resource.level}
        </span>
        {resource.year ? (
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-400">
            {resource.year}
          </span>
        ) : null}
        {resource.media.slice(0, 2).map((m) => (
          <span
            key={m}
            className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-400"
          >
            {m}
          </span>
        ))}
      </div>
      <h3 className="text-lg font-semibold text-slate-50">
        <Link
          href={`/resource/${resource.id}`}
          className="hover:text-saffron"
        >
          {resource.title}
        </Link>
      </h3>
      {resource.authors.length > 0 ? (
        <p className="mt-1 text-sm text-slate-400">
          {resource.authors.join(", ")}
          {resource.institution ? ` — ${resource.institution}` : ""}
        </p>
      ) : resource.institution ? (
        <p className="mt-1 text-sm text-slate-400">{resource.institution}</p>
      ) : null}
      <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-300">
        {resource.description}
      </p>
      <div className="mt-5 flex items-center justify-between gap-3 text-xs">
        {licenseUrl ? (
          <a
            href={licenseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-300 hover:border-emerald-400"
            title="Open license text"
          >
            {licenseLabel(resource.license)}
          </a>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-300">
            {licenseLabel(resource.license)}
          </span>
        )}
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-saffron hover:underline"
        >
          Open source →
        </a>
      </div>
    </article>
  );
}
