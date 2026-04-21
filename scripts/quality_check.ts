import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

import yaml from "js-yaml";

import { SourcesYamlSchema, type SourcesYaml } from "../data/schema.js";

const ROOT = process.cwd();
const CATALOG_ROOT = path.join(ROOT, "catalog");
const SOURCES_YAML = path.join(ROOT, "sources.yaml");

interface CatalogEntry {
  id: string;
  title: string;
  sourceId: string;
  url: string;
  license?: string;
  [key: string]: unknown;
}

async function loadWhitelist(): Promise<SourcesYaml> {
  const text = await fs.readFile(SOURCES_YAML, "utf8");
  const parsed = yaml.load(text);
  return SourcesYamlSchema.parse(parsed);
}

async function loadCatalog(): Promise<Array<{ file: string; entries: CatalogEntry[] }>> {
  const files = (await fs.readdir(CATALOG_ROOT)).filter((f) => f.endsWith(".json"));
  const out: Array<{ file: string; entries: CatalogEntry[] }> = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(CATALOG_ROOT, file), "utf8");
    out.push({ file, entries: JSON.parse(raw) as CatalogEntry[] });
  }
  return out;
}

function startsWithAny(url: string, prefixes: readonly string[]): string | null {
  for (const p of prefixes) {
    if (url.startsWith(p)) return p;
  }
  return null;
}

function containsBlacklisted(url: string, blacklist: readonly string[]): string | null {
  const lower = url.toLowerCase();
  for (const bad of blacklist) {
    if (bad && lower.includes(bad.toLowerCase())) return bad;
  }
  return null;
}

async function main(): Promise<void> {
  const whitelist = await loadWhitelist();
  const allowedPrefixes = whitelist.sources.flatMap((s) => s.base_urls);
  const allowedSourceIds = new Set(whitelist.sources.map((s) => s.id));
  const blacklist = whitelist.url_blacklist;

  let errors = 0;
  const fail = (loc: string, msg: string) => {
    errors += 1;
    console.error(`✗ ${loc}: ${msg}`);
  };

  const catalog = await loadCatalog();
  let total = 0;

  for (const { file, entries } of catalog) {
    for (const [i, entry] of entries.entries()) {
      const loc = `catalog/${file}[${i}] ${entry.id ?? "<no-id>"}`;
      total += 1;

      if (!entry.license || entry.license.trim() === "") {
        fail(loc, "license is empty");
      }
      if (!entry.url || typeof entry.url !== "string") {
        fail(loc, "url is missing");
        continue;
      }
      if (!allowedSourceIds.has(entry.sourceId)) {
        fail(loc, `sourceId ${entry.sourceId} is not declared in sources.yaml`);
      }

      const matchedPrefix = startsWithAny(entry.url, allowedPrefixes);
      if (!matchedPrefix) {
        fail(
          loc,
          `url ${entry.url} does not start with any whitelisted base_url`,
        );
      } else {
        const source = whitelist.sources.find((s) => s.id === entry.sourceId);
        if (source && !source.base_urls.some((b) => entry.url.startsWith(b))) {
          fail(
            loc,
            `url ${entry.url} matches a whitelisted prefix but not one belonging to its declared sourceId (${entry.sourceId})`,
          );
        }
      }

      const bad = containsBlacklisted(entry.url, blacklist);
      if (bad) {
        fail(loc, `url contains blacklisted substring "${bad}"`);
      }
    }
  }

  console.log(
    `quality check: ${total} entries across ${catalog.length} subject file(s), ` +
      `${allowedPrefixes.length} whitelisted base URLs, ` +
      `${blacklist.length} blacklisted substrings`,
  );

  if (errors > 0) {
    console.error(`\n${errors} quality-check error(s) found.`);
    process.exit(1);
  }
  console.log("catalog passes all quality checks.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
