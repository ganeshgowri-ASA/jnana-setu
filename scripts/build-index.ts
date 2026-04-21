import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

import { ResourceSchema, type Resource } from "../data/schema.js";

const ROOT = process.cwd();
const CATALOG_ROOT = path.join(ROOT, "catalog");
const OUT_FILE = path.join(ROOT, "public", "catalog-index.json");

async function main(): Promise<void> {
  const files = (await fs.readdir(CATALOG_ROOT)).filter((f) => f.endsWith(".json"));
  const byId = new Map<string, Resource>();
  for (const file of files) {
    const raw = JSON.parse(
      await fs.readFile(path.join(CATALOG_ROOT, file), "utf8"),
    ) as unknown[];
    for (const entry of raw) {
      const parsed = ResourceSchema.parse(entry);
      if (!byId.has(parsed.id)) byId.set(parsed.id, parsed);
    }
  }

  const slim = Array.from(byId.values()).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    url: r.url,
    subjects: r.subjects,
    media: r.media,
    level: r.level,
    sourceId: r.sourceId,
    license: r.license,
    gateTopics: r.gateTopics,
    tags: r.tags,
  }));

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(slim, null, 2));
  console.log(`Wrote ${slim.length} entries to ${path.relative(ROOT, OUT_FILE)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
