import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  ResourceSchema,
  SourceSchema,
  SubjectSchema,
  type Resource,
  type Source,
  type Subject,
} from "../data/schema.js";

const DATA_ROOT = path.join(process.cwd(), "data");
const RESOURCES_DIR = path.join(DATA_ROOT, "resources");

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

  const sourcesRaw = await readJson<unknown[]>(path.join(DATA_ROOT, "sources.json"));
  const sources: Source[] = [];
  for (const [i, entry] of sourcesRaw.entries()) {
    const parsed = SourceSchema.safeParse(entry);
    if (!parsed.success) {
      fail(`sources.json[${i}]: ${parsed.error.message}`);
      continue;
    }
    sources.push(parsed.data);
  }
  const sourceIds = new Set(sources.map((s) => s.id));

  const files = (await fs.readdir(RESOURCES_DIR)).filter((f) => f.endsWith(".json"));
  const seenIds = new Set<string>();
  const resources: Resource[] = [];

  for (const file of files) {
    const raw = await readJson<unknown[]>(path.join(RESOURCES_DIR, file));
    for (const [i, entry] of raw.entries()) {
      const parsed = ResourceSchema.safeParse(entry);
      if (!parsed.success) {
        fail(`resources/${file}[${i}]: ${parsed.error.message}`);
        continue;
      }
      const r = parsed.data;
      if (seenIds.has(r.id)) fail(`resources/${file}[${i}]: duplicate id ${r.id}`);
      seenIds.add(r.id);

      if (!sourceIds.has(r.sourceId)) {
        fail(`resources/${file}[${i}] (${r.id}): unknown sourceId ${r.sourceId}`);
      }
      for (const s of r.subjects) {
        if (!subjectSlugs.has(s)) {
          fail(`resources/${file}[${i}] (${r.id}): unknown subject slug ${s}`);
        }
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
