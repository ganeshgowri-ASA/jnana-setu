"""OpenStax scraper.

Calls the OpenStax CMS API for all books and keeps the ones tagged with
subjects relevant to EEE study (physics / engineering / math / statistics).
All OpenStax books are CC BY 4.0 unless the API says otherwise.
"""

from __future__ import annotations

import logging

from .base import HttpClient, assert_whitelisted, merge_into_subject
from .subjects import tag_subject

LOG = logging.getLogger(__name__)

BOOKS_API = "https://openstax.org/api/v2/pages/?type=books.Book&limit=200"
ALLOWED_SUBJECT_KEYWORDS = (
    "physics", "engineering", "math", "calculus",
    "algebra", "statistics", "probability",
)


def _collect_books(payload: object) -> list[dict]:
    if isinstance(payload, dict):
        for key in ("items", "results", "data"):
            value = payload.get(key)
            if isinstance(value, list):
                return [x for x in value if isinstance(x, dict)]
    if isinstance(payload, list):
        return [x for x in payload if isinstance(x, dict)]
    return []


def _is_relevant(book: dict) -> bool:
    subjects = book.get("subjects") or book.get("subject_categories") or []
    if isinstance(subjects, list):
        haystack = " ".join(str(s) for s in subjects).lower()
    else:
        haystack = str(subjects).lower()
    title = (book.get("title") or "").lower()
    needle = f"{title} {haystack}"
    return any(kw in needle for kw in ALLOWED_SUBJECT_KEYWORDS)


def _normalize(book: dict) -> dict | None:
    title = (book.get("title") or "").strip()
    slug = (book.get("slug") or book.get("meta", {}).get("slug") or "").strip()
    if not title or not slug:
        return None

    subject = tag_subject(title)
    if subject is None:
        # fall back to the broadest bucket for physics/math textbooks
        subject = "engineering-mathematics"

    url = f"https://openstax.org/details/books/{slug}"
    try:
        assert_whitelisted(url)
    except Exception as exc:
        LOG.warning("whitelist rejected OpenStax url %s: %s", url, exc)
        return None

    license_name = (book.get("license_name") or "CC BY 4.0").replace(" ", "-")
    if license_name not in {"CC-BY-4.0", "CC-BY-SA-4.0"}:
        LOG.info("skipping OpenStax %s — unexpected license %s", slug, license_name)
        return None

    return {
        "id": f"openstax-{slug}",
        "title": title,
        "description": (book.get("description") or f"OpenStax open textbook: {title}")[:800],
        "sourceId": "openstax",
        "url": url,
        "subjects": [subject],
        "media": ["textbook"],
        "level": "ug",
        "authors": [],
        "institution": "OpenStax, Rice University",
        "license": license_name,
        "licenseUrl": book.get("license_url") or "https://creativecommons.org/licenses/by/4.0/",
        "gateTopics": [],
        "tags": ["textbook"],
    }


def fetch(client: HttpClient | None = None) -> int:
    client = client or HttpClient()
    result = client.get(BOOKS_API, accept_json=True)
    if result is None:
        LOG.error("OpenStax API unreachable")
        return 0

    books = _collect_books(result.json())
    by_subject: dict[str, list[dict]] = {}
    for book in books:
        if not _is_relevant(book):
            continue
        entry = _normalize(book)
        if entry is None:
            continue
        by_subject.setdefault(entry["subjects"][0], []).append(entry)

    total = 0
    for subject, entries in by_subject.items():
        added, updated = merge_into_subject(subject, entries)
        LOG.info("OpenStax → %s: +%d / ~%d", subject, added, updated)
        total += added + updated
    return total


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    fetch()
