# rag/

Offline retrieval layer for the jnana-setu catalog. Pure TF-IDF scoring — no
hosted LLMs, no embedding APIs, no vector databases, no network calls at
runtime, no API keys, no environment variables.

## What this layer does

Given a free-text query and a catalog of study resources, returns the top-k
matching catalog entries ranked by TF-IDF cosine similarity. The API does
**not** generate, summarize, or rewrite text — it only ranks existing
catalog entries.

## Contents

| File              | Role                                                              |
| ----------------- | ----------------------------------------------------------------- |
| `types.ts`        | `CatalogEntry`, `ScoredEntry`, `SearchOptions` type definitions.  |
| `tfidf.ts`        | Pure-JS `TfidfIndex` used by the `/api/ask` route at runtime.     |
| `index.ts`        | Public module exports.                                            |
| `build_index.py`  | Offline reference implementation using scikit-learn's `TfidfVectorizer`. |

## Runtime (TypeScript)

The `/api/ask` route loads `catalog/catalog.json` on cold start, fits a
`TfidfIndex` in memory, and scores every incoming query against it. All
scoring happens in-process — no outbound network calls.

The math matches `scikit-learn`'s defaults:

- lowercase alphanumeric tokenization, tokens of length >= 2, small stopword list
- smoothed IDF: `idf(t) = ln((N + 1) / (df(t) + 1)) + 1`
- raw term frequency (no sublinear scaling)
- L2-normalized TF-IDF vectors, cosine similarity for ranking

### Request

```
POST /api/ask
Content-Type: application/json

{ "query": "laplace transform", "topK": 10 }
```

`topK` is optional (default 10, maximum 50).

### Response

```json
{
  "results": [
    { "entry": { "id": "...", "title": "...", "url": "...", ... }, "score": 0.42 },
    ...
  ]
}
```

Responses contain only ranked catalog entries and numeric scores — no
generated text, no summaries.

## Offline index build (Python)

`build_index.py` fits scikit-learn's `TfidfVectorizer` on the catalog and
writes the vocabulary, IDF vector, and per-entry TF-IDF vectors to JSON. It
is intended for offline QA, reproducibility checks, and pipeline validation;
the API route does not require its output.

```bash
pip install scikit-learn
python rag/build_index.py --catalog catalog/catalog.json --out rag/index.json
```

## Expected catalog shape

Each entry is a JSON object with at minimum an `id` and `title`. Optional
fields contribute to the indexed text:

```json
{
  "id": "nptel-ee-0001",
  "title": "Signals and Systems",
  "url": "https://nptel.ac.in/courses/...",
  "description": "Introductory signals and systems course...",
  "source": "NPTEL",
  "topics": ["signals", "systems", "laplace", "fourier"]
}
```

## Non-goals

- No LLM-generated answers, summaries, or paraphrases.
- No embeddings, vector DBs, or hosted model calls.
- No authentication, rate limiting, or caching beyond process memory — those
  belong in the surrounding infrastructure, not here.
