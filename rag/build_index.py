"""Offline TF-IDF index builder for the jnana-setu catalog.

Reads a catalog JSON (list of entries with at minimum `id` and `title`),
fits a scikit-learn TfidfVectorizer, and writes the vocabulary, IDF
weights, and per-entry TF-IDF vectors to a JSON file.

This is an offline, zero-network tool. Runtime querying lives in
`rag/tfidf.ts` and re-implements the same math in plain JavaScript, so
this script is not required for the API route to function -- it exists
for reproducibility, validation, and offline catalog QA.

Usage:
    python rag/build_index.py --catalog catalog/catalog.json \
                              --out rag/index.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

from sklearn.feature_extraction.text import TfidfVectorizer


STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "been", "being", "by", "but",
    "can", "do", "does", "did", "for", "from", "had", "has", "have", "if",
    "in", "into", "is", "it", "its", "of", "on", "or", "that", "the", "this",
    "to", "was", "were", "will", "with", "would",
}

TOKEN_RE = re.compile(r"[a-z0-9]+")


def tokenize(text: str) -> list[str]:
    return [t for t in TOKEN_RE.findall(text.lower()) if len(t) > 1 and t not in STOPWORDS]


def entry_text(entry: dict[str, Any]) -> str:
    parts: list[str] = [str(entry.get("title", ""))]
    if entry.get("description"):
        parts.append(str(entry["description"]))
    if entry.get("source"):
        parts.append(str(entry["source"]))
    topics = entry.get("topics")
    if isinstance(topics, list) and topics:
        parts.append(" ".join(str(t) for t in topics))
    return " ".join(p for p in parts if p)


def build(catalog_path: Path, out_path: Path) -> None:
    with catalog_path.open("r", encoding="utf-8") as f:
        entries = json.load(f)

    if not isinstance(entries, list):
        print(f"error: {catalog_path} must contain a JSON array", file=sys.stderr)
        sys.exit(1)

    corpus = [entry_text(e) for e in entries]
    vectorizer = TfidfVectorizer(
        tokenizer=tokenize,
        preprocessor=None,
        lowercase=False,
        token_pattern=None,
        norm="l2",
        sublinear_tf=False,
        smooth_idf=True,
    )
    matrix = vectorizer.fit_transform(corpus)

    vocabulary = vectorizer.vocabulary_
    idf_values = vectorizer.idf_.tolist()

    entry_vectors: list[dict[str, float]] = []
    for row in matrix:
        coo = row.tocoo()
        entry_vectors.append({str(int(col)): float(val) for col, val in zip(coo.col, coo.data)})

    payload = {
        "version": 1,
        "entry_count": len(entries),
        "vocabulary": {term: int(idx) for term, idx in vocabulary.items()},
        "idf": idf_values,
        "entry_ids": [str(e["id"]) for e in entries],
        "entry_vectors": entry_vectors,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f)

    print(
        f"indexed {len(entries)} entries, {len(vocabulary)} terms -> {out_path}",
        file=sys.stderr,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, required=True, help="Path to catalog JSON")
    parser.add_argument("--out", type=Path, required=True, help="Path to write index JSON")
    args = parser.parse_args()
    build(args.catalog, args.out)


if __name__ == "__main__":
    main()
