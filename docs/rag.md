# Retrieval layer architecture

## Principles

1. **Offline only.** No hosted LLMs, embedding APIs, or vector databases.
2. **Retrieval, not generation.** The layer ranks existing catalog entries.
   It does not summarize, paraphrase, or explain.
3. **Zero runtime configuration.** No API keys, no environment variables,
   no outbound network calls at request time.

## Data flow

```
        build time (optional)                 request time
   ┌─────────────────────────┐           ┌──────────────────────┐
   │ catalog/catalog.json    │           │ POST /api/ask        │
   │   (owned by scrapers)   │           │   { query, topK }    │
   └───────────┬─────────────┘           └──────────┬───────────┘
               │                                    │
               ▼                                    ▼
   ┌─────────────────────────┐           ┌──────────────────────┐
   │ rag/build_index.py      │           │ pages/api/ask.ts     │
   │  (scikit-learn QA tool) │           │  loads catalog once, │
   │  writes rag/index.json  │           │  fits TfidfIndex in  │
   └─────────────────────────┘           │  process memory      │
                                         └──────────┬───────────┘
                                                    │
                                                    ▼
                                         ┌──────────────────────┐
                                         │ { results: [{entry,  │
                                         │   score}, ...] }     │
                                         └──────────────────────┘
```

## Scoring

Both implementations target the same math so the Python offline tool and
the TS runtime produce comparable rankings:

- Tokenizer: lowercase, alphanumeric, length >= 2, small English stopword list.
- IDF: `ln((N + 1) / (df + 1)) + 1` (`smooth_idf=True`).
- Term weights: raw TF * IDF (no sublinear scaling).
- Document vectors: L2-normalized.
- Ranking: cosine similarity.

## Module boundaries

| Area                  | Lives in        | Owner              |
| --------------------- | --------------- | ------------------ |
| Source scraping       | `scrapers/`     | other session      |
| Catalog JSON          | `catalog/`      | other session      |
| Retrieval (this layer)| `rag/`          | this branch        |
| HTTP endpoint         | `pages/api/`    | this branch        |
| UI rendering          | `components/`   | UI session         |

The retrieval layer reads `catalog/catalog.json` at runtime but never writes
to `catalog/` or `scrapers/`.

## Why TF-IDF

- Zero dependencies at runtime (no embedding model to ship).
- Deterministic, reproducible, auditable — every score can be explained in
  terms of term frequencies and document counts.
- Fast to rebuild when the catalog changes — no batch embedding runs.
- Good enough for keyword-style queries against structured catalog entries
  (course titles, descriptions, topics).

Semantic search (dense embeddings) and reranking with LLMs are explicitly
out of scope for this layer.

## Non-goals

- Generated answers, summaries, or citations-with-prose.
- Cross-session caching (results are computed per request from the
  in-process index).
- Query rewriting, spell correction, or synonym expansion.
