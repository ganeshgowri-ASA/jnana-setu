import type { CatalogEntry, ScoredEntry, SearchOptions } from "./types";

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "being", "by", "but",
  "can", "do", "does", "did", "for", "from", "had", "has", "have", "if",
  "in", "into", "is", "it", "its", "of", "on", "or", "that", "the", "this",
  "to", "was", "were", "will", "with", "would",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function entryText(entry: CatalogEntry): string {
  const parts: string[] = [entry.title];
  if (entry.description) parts.push(entry.description);
  if (entry.source) parts.push(entry.source);
  if (entry.topics && entry.topics.length) parts.push(entry.topics.join(" "));
  return parts.join(" ");
}

interface IndexedDoc {
  entry: CatalogEntry;
  tf: Map<string, number>;
  norm: number;
}

export class TfidfIndex {
  private docs: IndexedDoc[] = [];
  private idf: Map<string, number> = new Map();

  constructor(entries: CatalogEntry[] = []) {
    if (entries.length > 0) this.build(entries);
  }

  build(entries: CatalogEntry[]): void {
    const tokenized = entries.map((entry) => ({
      entry,
      tokens: tokenize(entryText(entry)),
    }));

    const df = new Map<string, number>();
    for (const { tokens } of tokenized) {
      const unique = new Set(tokens);
      for (const term of unique) {
        df.set(term, (df.get(term) ?? 0) + 1);
      }
    }

    const N = tokenized.length;
    this.idf = new Map();
    for (const [term, freq] of df.entries()) {
      this.idf.set(term, Math.log((N + 1) / (freq + 1)) + 1);
    }

    this.docs = tokenized.map(({ entry, tokens }) => {
      const tf = new Map<string, number>();
      for (const term of tokens) {
        tf.set(term, (tf.get(term) ?? 0) + 1);
      }
      let sumSquares = 0;
      for (const [term, count] of tf.entries()) {
        const weight = count * (this.idf.get(term) ?? 0);
        sumSquares += weight * weight;
      }
      return { entry, tf, norm: Math.sqrt(sumSquares) || 1 };
    });
  }

  size(): number {
    return this.docs.length;
  }

  search(query: string, opts: SearchOptions = {}): ScoredEntry[] {
    if (this.docs.length === 0) return [];
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const queryTf = new Map<string, number>();
    for (const term of queryTokens) {
      queryTf.set(term, (queryTf.get(term) ?? 0) + 1);
    }

    let queryNormSq = 0;
    const queryWeights = new Map<string, number>();
    for (const [term, count] of queryTf.entries()) {
      const idf = this.idf.get(term);
      if (idf === undefined) continue;
      const weight = count * idf;
      queryWeights.set(term, weight);
      queryNormSq += weight * weight;
    }
    const queryNorm = Math.sqrt(queryNormSq) || 1;

    const scored: ScoredEntry[] = this.docs.map((doc) => {
      let dot = 0;
      for (const [term, qWeight] of queryWeights.entries()) {
        const tf = doc.tf.get(term);
        if (!tf) continue;
        const docWeight = tf * (this.idf.get(term) ?? 0);
        dot += qWeight * docWeight;
      }
      return { entry: doc.entry, score: dot / (queryNorm * doc.norm) };
    });

    const topK = opts.topK ?? 10;
    const minScore = opts.minScore ?? 0;
    return scored
      .filter((s) => s.score > minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
