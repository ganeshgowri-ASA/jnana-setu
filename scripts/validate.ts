import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

import yaml from "js-yaml";

import {
  ResourceSchema,
  SourcesYamlSchema,
  SubjectSchema,
  type Resource,
  type SourcesYaml,
  type Subject,
} from "../data/schema.js";

const ROOT = process.cwd();
const DATA_ROOT = path.join(ROOT, "data");
const CATALOG_ROOT = path.join(ROOT, "catalog");
const SOURCES_YAML = path.join(ROOT, "sources.yaml");

async function readJson<T>(p: string): Promise<T> {
  return JSON.parse(await fs.readFile(p, "utf8")) as T;
}

async function main(): Promise<void> {
  let errors = 0;
  const fail = (msg: string) => {
    errors += 1;
    console.error(`✗ ${msg}`);
  };

  const subjectsRaw = await readJson<unknown[]>(path.join(DATA_ROOT, "subjects.json"));
  const subjects: Subject[] = [];
  for (const [i, entry] of subjectsRaw.entries()) {
    const parsed = SubjectSchema.safeParse(entry);
    if (!parsed.success) {
      fail(`subjects.json[${i}]: ${parsed.error.message}`);
      continue;
    }
    subjects.push(parsed.data);
  }
  const subjectSlugs = new Set(subjects.map((s) => s.slug));

  const yamlRaw = await fs.readFile(SOURCES_YAML, "utf8");
  const parsedYaml = SourcesYamlSchema.safeParse(yaml.load(yamlRaw));
  let sources: SourcesYaml["sources"] = [];
  if (!parsedYaml.success) {
    fail(`sources.yaml: ${parsedYaml.error.message}`);
  } else {
    sources = parsedYaml.data.sources;
  }
  const sourceIds = new Set(sources.map((s) => s.id));

  let catalogFiles: string[] = [];
  try {
    catalogFiles = (await fs.readdir(CATALOG_ROOT)).filter((f) => f.endsWith(".json"));
  } catch {
    fail(`catalog/ directory is missing`);
  }

  const seenIds = new Set<string>();
  const resources: Resource[] = [];

  for (const file of catalogFiles) {
    const subjectSlug = path.basename(file, ".json");
    if (!subjectSlugs.has(subjectSlug)) {
      fail(`catalog/${file}: filename does not match any subject slug`);
    }
    const raw = await readJson<unknown[]>(path.join(CATALOG_ROOT, file));
    for (const [i, entry] of raw.entries()) {
      const parsed = ResourceSchema.safeParse(entry);
      if (!parsed.success) {
        fail(`catalog/${file}[${i}]: ${parsed.error.message}`);
        continue;
      }
      const r = parsed.data;
      if (seenIds.has(r.id)) {
        fail(`catalog/${file}[${i}]: duplicate id ${r.id}`);
      }
      seenIds.add(r.id);

      if (!sourceIds.has(r.sourceId)) {
        fail(`catalog/${file}[${i}] (${r.id}): unknown sourceId ${r.sourceId}`);
      }
      for (const s of r.subjects) {
        if (!subjectSlugs.has(s)) {
          fail(`catalog/${file}[${i}] (${r.id}): unknown subject slug ${s}`);
        }
      }
      if (!r.subjects.includes(subjectSlug)) {
        fail(
          `catalog/${file}[${i}] (${r.id}): filed under ${subjectSlug}.json but entry.subjects does not include ${subjectSlug}`,
        );
      }
      resources.push(r);
    }
  }

  console.log(
    `Catalog: ${subjects.length} subjects, ${sources.length} sources, ${resources.length} resources`,
  );

  if (errors > 0) {
    console.error(`\n${errors} validation error(s) found.`);
    process.exit(1);
  }
  console.log("All catalog entries are valid.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
