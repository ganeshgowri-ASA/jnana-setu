import Link from "next/link";

export function LegalBadge({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/licensing"
      className={
        "inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300 transition hover:border-emerald-400 hover:bg-emerald-500/20 " +
        className
      }
    >
      <span
        aria-hidden="true"
        className="inline-block h-2 w-2 rounded-full bg-emerald-400"
      />
      Legal &amp; Open
    </Link>
  );
}
