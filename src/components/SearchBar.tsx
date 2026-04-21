"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

export function SearchBar({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(initialQuery);

  useEffect(() => {
    setValue(params.get("q") ?? "");
  }, [params]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (value.trim()) next.set("q", value.trim());
    else next.delete("q");
    router.push(`/?${next.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} className="w-full">
      <label htmlFor="q" className="sr-only">
        Search study material
      </label>
      <div className="flex overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm focus-within:border-saffron focus-within:ring-2 focus-within:ring-saffron/30">
        <input
          id="q"
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search — e.g. 'root locus', 'transformers', 'Fourier'"
          className="w-full px-4 py-3 text-base outline-none"
          autoComplete="off"
        />
        <button
          type="submit"
          className="bg-ink px-6 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Search
        </button>
      </div>
    </form>
  );
}
