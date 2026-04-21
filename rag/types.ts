export interface CatalogEntry {
  id: string;
  title: string;
  url?: string;
  description?: string;
  source?: string;
  topics?: string[];
  [key: string]: unknown;
}

export interface ScoredEntry {
  entry: CatalogEntry;
  score: number;
}

export interface SearchOptions {
  topK?: number;
  minScore?: number;
}
