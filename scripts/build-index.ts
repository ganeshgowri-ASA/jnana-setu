import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

import { ResourceSchema, type Resource } from "../data/schema.js";

const DATA_ROOT = path.join(process.cwd(), "data");
const RESOURCES_DIR = path.join(DATA_ROOT, "resources");
const OUT_FILE = path.join(process.cwd(), "public", "catalog-index.json");

async function main(): Promise<void> {
  const files = (await fs.readdir(RESOURCES_DIR)).filter((f) => f.endsWith(".json"));
  const resources: Resource[] = [];
  for (const file of files) {
    const raw = JSON.parse(
      await fs.readFile(path.join(RESOURCES_DIR, file), "utf8"),
    ) as unknown[];
    for (const entry of raw) {
      resources.push(ResourceSchema.parse(entry));
    }
  }

  const slim = resources.map((r) => ({
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
  console.log(`Wrote ${slim.length} entries to ${path.relative(process.cwd(), OUT_FILE)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
