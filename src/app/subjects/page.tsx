import { SubjectTile } from "@/components/SubjectTile";
import { getCatalog } from "@/lib/catalog";

export const metadata = { title: "Subjects" };

export default async function SubjectsIndexPage() {
  const catalog = await getCatalog();
  const counts = new Map<string, number>();
  for (const r of catalog.resources) {
    for (const s of r.subjects) counts.set(s, (counts.get(s) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-ink">All subjects</h1>
      <p className="mt-2 text-slate-600">
        Electrical Engineering topics, weighted to the GATE EE syllabus.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {catalog.subjects.map((subject) => (
          <SubjectTile
            key={subject.slug}
            subject={subject}
            count={counts.get(subject.slug) ?? 0}
          />
        ))}
      </div>
    </div>
  );
}
