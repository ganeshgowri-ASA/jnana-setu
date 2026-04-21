"use client";

import Fuse, { type IFuseOptions } from "fuse.js";
import { useDeferredValue, useMemo, useState } from "react";

import { FilterChips } from "@/components/FilterChips";
import { ResourceCard } from "@/components/ResourceCard";
import { ResourceCardSkeleton } from "@/components/ResourceCardSkeleton";
import { licenseLabel } from "@/lib/licenses";
import type { License, Media, Resource, Source, Subject } from "@data/schema";

const FUSE_OPTIONS: IFuseOptions<Resource> = {
  includeScore: true,
  threshold: 0.38,
  ignoreLocation: true,
  keys: [
    { name: "title", weight: 0.5 },
    { name: "authors", weight: 0.2 },
    { name: "tags", weight: 0.15 },
    { name: "gateTopics", weight: 0.1 },
    { name: "description", weight: 0.05 },
  ],
};

interface Props {
  resources: Resource[];
  sources: Source[];
  subjects: Subject[];
}

type MediaFilter = Media;

export function HomeBrowser({ resources, sources, subjects }: Props) {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [license, setLicense] = useState<License | null>(null);
  const [media, setMedia] = useState<MediaFilter | null>(null);

  const deferredQuery = useDeferredValue(query);
  const isStale = deferredQuery !== query;

  const fuse = useMemo(() => new Fuse(resources, FUSE_OPTIONS), [resources]);
  const sourceMap = useMemo(
    () => new Map(sources.map((s) => [s.id, s])),
    [sources],
  );

  const subjectOptions = useMemo(
    () =>
      subjects
        .map((s) => ({
          value: s.slug,
          label: s.shortName ?? s.name,
          count: resources.filter((r) => r.subjects.includes(s.slug)).length,
        }))
        .filter((o) => o.count > 0)
        .sort((a, b) => b.count - a.count),
    [subjects, resources],
  );

  const sourceOptions = useMemo(
    () =>
      sources.map((s) => ({
        value: s.id,
        label: s.name,
        count: resources.filter((r) => r.sourceId === s.id).length,
      })).filter((o) => o.count > 0),
    [sources, resources],
  );

  const licenseOptions = useMemo(() => {
    const counts = new Map<License, number>();
    for (const r of resources) {
      counts.set(r.license, (counts.get(r.license) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([lic, count]) => ({
      value: lic,
      label: licenseLabel(lic),
      count,
    }));
  }, [resources]);

  const mediaOptions = useMemo(() => {
    const counts = new Map<Media, number>();
    for (const r of resources) {
      for (const m of r.media) counts.set(m, (counts.get(m) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([m, count]) => ({ value: m, label: m, count }));
  }, [resources]);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim();
    const base = q
      ? fuse.search(q, { limit: 200 }).map((hit) => hit.item)
      : resources;
    return base.filter((r) => {
      if (subject && !r.subjects.includes(subject)) return false;
      if (sourceId && r.sourceId !== sourceId) return false;
      if (license && r.license !== license) return false;
      if (media && !r.media.includes(media)) return false;
      return true;
    });
  }, [deferredQuery, fuse, resources, subject, sourceId, license, media]);

  const hasActiveFilters =
    Boolean(subject || sourceId || license || media || query.trim());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-sm focus-within:border-saffron focus-within:ring-2 focus-within:ring-saffron/30">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search — e.g. 'root locus', 'Strang', 'Fourier'"
          aria-label="Search study material"
          className="w-full bg-transparent px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 outline-none"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="px-4 text-sm text-slate-400 hover:text-slate-200"
            aria-label="Clear search"
          >
            ×
          </button>
        ) : null}
      </div>

      <div className="space-y-3">
        <FilterChips
          label="Subject"
          options={subjectOptions}
          selected={subject}
          onChange={setSubject}
        />
        <FilterChips
          label="Source"
          options={sourceOptions}
          selected={sourceId}
          onChange={setSourceId}
        />
        <FilterChips
          label="License"
          options={licenseOptions.map((o) => ({
            value: o.value as string,
            label: o.label,
            count: o.count,
          }))}
          selected={license}
          onChange={(v) => setLicense(v as License | null)}
        />
        <FilterChips
          label="Type"
          options={mediaOptions.map((o) => ({
            value: o.value as string,
            label: o.label,
            count: o.count,
          }))}
          selected={media}
          onChange={(v) => setMedia(v as MediaFilter | null)}
        />
      </div>

      <div className="flex items-baseline justify-between border-t border-slate-800 pt-4">
        <p className="text-sm text-slate-400">
          {filtered.length} {filtered.length === 1 ? "result" : "results"}
          {query ? ` for “${query}”` : ""}
        </p>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSubject(null);
              setSourceId(null);
              setLicense(null);
              setMedia(null);
            }}
            className="text-xs text-slate-400 hover:text-saffron"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {isStale ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ResourceCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState query={query} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              source={sourceMap.get(resource.sourceId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-10 text-center">
      <p className="text-lg font-semibold text-slate-200">
        Nothing matches{query ? ` “${query}”` : " those filters"}.
      </p>
      <p className="mt-2 text-sm text-slate-400">
        Try a shorter phrase, clear a filter, or browse by subject from the
        navigation. Every resource in jnana-setu is hand-vetted against the{" "}
        <a href="/licensing" className="text-saffron hover:underline">
          licensing policy
        </a>
        .
      </p>
    </div>
  );
}
