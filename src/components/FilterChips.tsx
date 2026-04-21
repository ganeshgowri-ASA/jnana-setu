"use client";

interface FilterChipsProps {
  label: string;
  options: Array<{ value: string; label: string; count?: number }>;
  selected: string | null;
  onChange: (value: string | null) => void;
}

export function FilterChips({ label, options, selected, onChange }: FilterChipsProps) {
  if (options.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <button
        type="button"
        onClick={() => onChange(null)}
        className={
          "rounded-full border px-3 py-1 text-xs font-medium transition " +
          (selected === null
            ? "border-saffron bg-saffron/20 text-saffron"
            : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500")
        }
      >
        All
      </button>
      {options.map((opt) => {
        const active = selected === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(active ? null : opt.value)}
            aria-pressed={active}
            className={
              "rounded-full border px-3 py-1 text-xs font-medium transition " +
              (active
                ? "border-saffron bg-saffron/20 text-saffron"
                : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500")
            }
          >
            {opt.label}
            {typeof opt.count === "number" ? (
              <span className="ml-1.5 text-[10px] text-slate-400">
                {opt.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
