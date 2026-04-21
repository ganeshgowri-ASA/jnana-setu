import Link from "next/link";

import type { Subject } from "@data/schema";

export function SubjectTile({ subject, count }: { subject: Subject; count: number }) {
  return (
    <Link
      href={`/subjects/${subject.slug}`}
      className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-saffron hover:shadow-md"
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-ink">{subject.name}</h3>
        <span className="text-xs text-slate-500">{count} {count === 1 ? "resource" : "resources"}</span>
      </div>
      {typeof subject.gateWeightPercent === "number" ? (
        <p className="mt-1 text-xs text-slate-500">
          GATE weight ~{subject.gateWeightPercent}%
        </p>
      ) : null}
      <p className="mt-2 text-sm text-slate-700">{subject.description}</p>
    </Link>
  );
}
