import Link from "next/link";

import type { Subject } from "@data/schema";

export function SubjectTile({ subject, count }: { subject: Subject; count: number }) {
  return (
    <Link
      href={`/subjects/${subject.slug}`}
      className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-saffron hover:shadow-lg"
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-slate-50">{subject.name}</h3>
        <span className="text-xs text-slate-400">
          {count} {count === 1 ? "resource" : "resources"}
        </span>
      </div>
      {typeof subject.gateWeightPercent === "number" ? (
        <p className="mt-1 text-xs text-slate-500">
          GATE weight ~{subject.gateWeightPercent}%
        </p>
      ) : null}
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        {subject.description}
      </p>
    </Link>
  );
}
