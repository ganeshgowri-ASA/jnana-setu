export function ResourceCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-5"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="skeleton h-4 w-16 animate-shimmer rounded-full" />
        <span className="skeleton h-4 w-12 animate-shimmer rounded-full" />
        <span className="skeleton h-4 w-20 animate-shimmer rounded-full" />
      </div>
      <span className="skeleton h-6 w-4/5 animate-shimmer rounded" />
      <span className="skeleton mt-2 h-4 w-1/2 animate-shimmer rounded" />
      <span className="skeleton mt-3 h-3 w-full animate-shimmer rounded" />
      <span className="skeleton mt-1 h-3 w-11/12 animate-shimmer rounded" />
      <span className="skeleton mt-1 h-3 w-3/4 animate-shimmer rounded" />
      <div className="mt-6 flex items-center justify-between">
        <span className="skeleton h-5 w-24 animate-shimmer rounded-full" />
        <span className="skeleton h-4 w-20 animate-shimmer rounded" />
      </div>
    </div>
  );
}
