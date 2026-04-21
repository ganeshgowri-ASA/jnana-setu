import Fuse, { type IFuseOptions } from "fuse.js";

import type { Resource } from "@data/schema";

const FUSE_OPTIONS: IFuseOptions<Resource> = {
  includeScore: true,
  threshold: 0.38,
  ignoreLocation: true,
  keys: [
    { name: "title", weight: 0.5 },
    { name: "description", weight: 0.2 },
    { name: "gateTopics", weight: 0.15 },
    { name: "tags", weight: 0.1 },
    { name: "authors", weight: 0.05 },
  ],
};

export interface SearchFilters {
  subject?: string;
  sourceId?: string;
  media?: string;
  level?: string;
}

export interface SearchResult {
  resource: Resource;
  score: number;
}

export function buildSearchIndex(resources: Resource[]): Fuse<Resource> {
  return new Fuse(resources, FUSE_OPTIONS);
}

export function searchCatalog(
  index: Fuse<Resource>,
  resources: Resource[],
  query: string,
  filters: SearchFilters = {},
  limit = 50,
): SearchResult[] {
  const trimmed = query.trim();
  const filtered = applyFilters(resources, filters);

  if (!trimmed) {
    return filtered
      .slice(0, limit)
      .map((resource) => ({ resource, score: 0 }));
  }

  const filteredIds = new Set(filtered.map((r) => r.id));
  const hits = index.search(trimmed, { limit: limit * 2 });

  return hits
    .filter((hit) => filteredIds.has(hit.item.id))
    .slice(0, limit)
    .map((hit) => ({ resource: hit.item, score: hit.score ?? 0 }));
}

function applyFilters(resources: Resource[], filters: SearchFilters): Resource[] {
  return resources.filter((r) => {
    if (filters.subject && !r.subjects.includes(filters.subject)) return false;
    if (filters.sourceId && r.sourceId !== filters.sourceId) return false;
    if (filters.media && !r.media.includes(filters.media as Resource["media"][number])) return false;
    if (filters.level && r.level !== filters.level) return false;
    return true;
  });
}
