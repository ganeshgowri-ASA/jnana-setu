import Link from "next/link";
import { notFound } from "next/navigation";

import { getCatalog, getSourceById } from "@/lib/catalog";
import { licenseHref, licenseLabel } from "@/lib/licenses";

export async function generateStaticParams() {
  const catalog = await getCatalog();
  return catalog.resources.map((r) => ({ id: r.id }));
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const catalog = await getCatalog();
  const resource = catalog.resources.find((r) => r.id === params.id);
  if (!resource) return { title: "Resource not found" };
  return {
    title: resource.title,
    description: resource.description,
  };
}

export default async function ResourcePage({ params }: { params: { id: string } }) {
  const catalog = await getCatalog();
  const resource = catalog.resources.find((r) => r.id === params.id);
  if (!resource) notFound();

  const source = getSourceById(catalog, resource.sourceId);
  const licenseUrl = licenseHref(resource.license, resource.licenseUrl);
  const subjectMap = new Map(catalog.subjects.map((s) => [s.slug, s]));

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm text-slate-500">
        {source?.name ?? resource.sourceId}
        {resource.institution ? ` · ${resource.institution}` : ""}
      </p>
      <h1 className="mt-1 text-3xl font-bold text-ink">{resource.title}</h1>
      {resource.authors.length > 0 ? (
        <p className="mt-2 text-slate-700">by {resource.authors.join(", ")}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-wide text-slate-500">
        <span className="rounded bg-parchment px-2 py-0.5 text-ink">{resource.level}</span>
        {resource.media.map((m) => (
          <span key={m} className="rounded bg-slate-100 px-2 py-0.5">{m}</span>
        ))}
        {resource.year ? (
          <span className="rounded bg-slate-100 px-2 py-0.5">{resource.year}</span>
        ) : null}
      </div>

      <p className="mt-6 text-base text-slate-800">{resource.description}</p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          License
        </h2>
        <p className="mt-1">
          {licenseUrl ? (
            <a
              href={licenseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-saffron hover:underline"
            >
              {licenseLabel(resource.license)}
            </a>
          ) : (
            <span>{licenseLabel(resource.license)}</span>
          )}
        </p>
        {source?.notes ? (
          <p className="mt-2 text-sm text-slate-600">{source.notes}</p>
        ) : null}
      </div>

      <div className="mt-6">
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-lg bg-saffron px-5 py-3 font-semibold text-white hover:bg-amber-600"
        >
          Open resource ↗
        </a>
      </div>

      {resource.subjects.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Subjects
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {resource.subjects.map((slug) => {
              const s = subjectMap.get(slug);
              return (
                <li key={slug}>
                  <Link
                    href={`/subjects/${slug}`}
                    className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:border-saffron hover:text-saffron"
                  >
                    {s?.name ?? slug}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {resource.gateTopics.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            GATE topics covered
          </h2>
          <ul className="mt-2 list-inside list-disc text-slate-700">
            {resource.gateTopics.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
