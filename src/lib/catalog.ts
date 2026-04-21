import { promises as fs } from "node:fs";
import path from "node:path";

import {
  ResourceSchema,
  SourceSchema,
  SubjectSchema,
  type Resource,
  type Source,
  type Subject,
} from "@data/schema";

const DATA_ROOT = path.join(process.cwd(), "data");
const RESOURCES_DIR = path.join(DATA_ROOT, "resources");

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export async function loadSubjects(): Promise<Subject[]> {
  const raw = await readJson<unknown[]>(path.join(DATA_ROOT, "subjects.json"));
  return raw.map((entry) => SubjectSchema.parse(entry));
}

export async function loadSources(): Promise<Source[]> {
  const raw = await readJson<unknown[]>(path.join(DATA_ROOT, "sources.json"));
  return raw.map((entry) => SourceSchema.parse(entry));
}

export async function loadResources(): Promise<Resource[]> {
  const entries = await fs.readdir(RESOURCES_DIR);
  const jsonFiles = entries.filter((f) => f.endsWith(".json"));
  const perFile = await Promise.all(
    jsonFiles.map(async (file) => {
      const raw = await readJson<unknown[]>(path.join(RESOURCES_DIR, file));
      return raw.map((entry) => ResourceSchema.parse(entry));
    }),
  );
  const all = perFile.flat();
  assertUniqueIds(all);
  return all;
}

function assertUniqueIds(resources: Resource[]): void {
  const seen = new Set<string>();
  for (const r of resources) {
    if (seen.has(r.id)) {
      throw new Error(`Duplicate resource id: ${r.id}`);
    }
    seen.add(r.id);
  }
}

export interface Catalog {
  subjects: Subject[];
  sources: Source[];
  resources: Resource[];
}

let cached: Promise<Catalog> | null = null;

export function getCatalog(): Promise<Catalog> {
  if (!cached) {
    cached = (async () => {
      const [subjects, sources, resources] = await Promise.all([
        loadSubjects(),
        loadSources(),
        loadResources(),
      ]);
      return { subjects, sources, resources };
    })();
  }
  return cached;
}

export function getSubjectBySlug(catalog: Catalog, slug: string): Subject | undefined {
  return catalog.subjects.find((s) => s.slug === slug);
}

export function getResourcesBySubject(catalog: Catalog, slug: string): Resource[] {
  return catalog.resources.filter((r) => r.subjects.includes(slug));
}

export function getSourceById(catalog: Catalog, id: string): Source | undefined {
  return catalog.sources.find((s) => s.id === id);
}
