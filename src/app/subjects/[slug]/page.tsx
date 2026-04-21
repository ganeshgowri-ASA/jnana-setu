import { notFound } from "next/navigation";

import { ResourceCard } from "@/components/ResourceCard";
import { getCatalog, getResourcesBySubject, getSubjectBySlug } from "@/lib/catalog";

export async function generateStaticParams() {
  const catalog = await getCatalog();
  return catalog.subjects.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const catalog = await getCatalog();
  const subject = getSubjectBySlug(catalog, params.slug);
  if (!subject) return { title: "Subject not found" };
  return {
    title: subject.name,
    description: subject.description,
  };
}

export default async function SubjectPage({ params }: { params: { slug: string } }) {
  const catalog = await getCatalog();
  const subject = getSubjectBySlug(catalog, params.slug);
  if (!subject) notFound();

  const resources = getResourcesBySubject(catalog, subject.slug);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm uppercase tracking-widest text-slate-500">Subject</p>
      <h1 className="mt-1 text-3xl font-bold text-slate-50">{subject.name}</h1>
      {typeof subject.gateWeightPercent === "number" ? (
        <p className="mt-1 text-sm text-slate-400">
          GATE EE weight ~{subject.gateWeightPercent}%
        </p>
      ) : null}
      <p className="mt-4 max-w-3xl text-slate-300">{subject.description}</p>

      <h2 className="mt-10 text-xl font-semibold text-slate-100">
        {resources.length} {resources.length === 1 ? "resource" : "resources"}
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {resources.map((resource) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            source={catalog.sources.find((s) => s.id === resource.sourceId)}
          />
        ))}
      </div>
    </div>
  );
}
