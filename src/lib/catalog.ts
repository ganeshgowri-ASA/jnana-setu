import { promises as fs } from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import {
  ResourceSchema,
  SourcesYamlSchema,
  SubjectSchema,
  type Resource,
  type Source,
  type SourcesYaml,
  type Subject,
} from "@data/schema";

const ROOT = process.cwd();
const DATA_ROOT = path.join(ROOT, "data");
const CATALOG_ROOT = path.join(ROOT, "catalog");
const SOURCES_YAML = path.join(ROOT, "sources.yaml");

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

export async function loadSubjects(): Promise<Subject[]> {
  const raw = await readJson<unknown[]>(path.join(DATA_ROOT, "subjects.json"));
  return raw.map((entry) => SubjectSchema.parse(entry));
}

export async function loadSourcesYaml(): Promise<SourcesYaml> {
  const raw = await fs.readFile(SOURCES_YAML, "utf8");
  const parsed = yaml.load(raw);
  return SourcesYamlSchema.parse(parsed);
}

export async function loadSources(): Promise<Source[]> {
  return (await loadSourcesYaml()).sources;
}

export async function loadResources(): Promise<Resource[]> {
  let entries: string[] = [];
  try {
    entries = await fs.readdir(CATALOG_ROOT);
  } catch {
    return [];
  }
  const jsonFiles = entries.filter((f) => f.endsWith(".json"));
  const perFile = await Promise.all(
    jsonFiles.map(async (file) => {
      const raw = await readJson<unknown[]>(path.join(CATALOG_ROOT, file));
      return raw.map((entry) => ResourceSchema.parse(entry));
    }),
  );
  return dedupeById(perFile.flat());
}

function dedupeById(resources: Resource[]): Resource[] {
  const seen = new Map<string, Resource>();
  for (const r of resources) {
    if (!seen.has(r.id)) seen.set(r.id, r);
  }
  return Array.from(seen.values());
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
