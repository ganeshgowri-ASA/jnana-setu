import { promises as fs } from "node:fs";
import path from "node:path";
import type { NextApiRequest, NextApiResponse } from "next";
import { TfidfIndex, type CatalogEntry, type ScoredEntry } from "../../rag";

type AskResponse = { results: ScoredEntry[] } | { error: string };

const DEFAULT_CATALOG_PATH = "catalog/catalog.json";
const MAX_TOP_K = 50;
const DEFAULT_TOP_K = 10;

let indexPromise: Promise<TfidfIndex> | null = null;

async function loadCatalog(): Promise<CatalogEntry[]> {
  const catalogPath = path.resolve(process.cwd(), DEFAULT_CATALOG_PATH);
  const raw = await fs.readFile(catalogPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Catalog at ${catalogPath} must be a JSON array`);
  }
  return parsed as CatalogEntry[];
}

function getIndex(): Promise<TfidfIndex> {
  if (!indexPromise) {
    indexPromise = loadCatalog().then((entries) => new TfidfIndex(entries));
  }
  return indexPromise;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AskResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? safeJSON(req.body) : req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Request body must be JSON" });
  }

  const query = (body as { query?: unknown }).query;
  if (typeof query !== "string" || query.trim().length === 0) {
    return res
      .status(400)
      .json({ error: "Field 'query' is required and must be a non-empty string" });
  }

  const topKRaw = (body as { topK?: unknown }).topK;
  const topK =
    typeof topKRaw === "number" && Number.isInteger(topKRaw) && topKRaw > 0 && topKRaw <= MAX_TOP_K
      ? topKRaw
      : DEFAULT_TOP_K;

  try {
    const index = await getIndex();
    const results = index.search(query, { topK });
    return res.status(200).json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return res.status(500).json({ error: `Search failed: ${message}` });
  }
}

function safeJSON(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
