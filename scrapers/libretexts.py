"""LibreTexts Engineering scraper.

Parses the ``eng.libretexts.org`` sitemap for electronics / electromagnetism
top-level pages and emits one catalog entry per Bookshelf. We don't chase
down every sub-page — the bookshelf landing page is what users want to
bookmark anyway.
"""

from __future__ import annotations

import logging
import re
from xml.etree import ElementTree as ET

from .base import HttpClient, assert_whitelisted, merge_into_subject
from .subjects import tag_subject

LOG = logging.getLogger(__name__)

SITEMAP_URL = "https://eng.libretexts.org/sitemap.xml"
SITEMAP_NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
BOOKSHELF_RE = re.compile(
    r"^https://eng\.libretexts\.org/Bookshelves/Electrical_Engineering/"
    r"(Electronics|Electromagnetics|Signal_Processing_and_Modeling|Electro(magnetics|nics))",
)
# accept the broad bookshelf landing and any first-level child
INTEREST_RE = re.compile(
    r"^https://eng\.libretexts\.org/Bookshelves/Electrical_Engineering(/[^/]+)?/?$"
)


def _humanize(segment: str) -> str:
    return segment.replace("_", " ").strip()


def _title_from_url(url: str) -> str:
    tail = url.rstrip("/").rsplit("/", 1)[-1]
    return _humanize(tail)


def _id_from_url(url: str) -> str:
    tail = url.rstrip("/").rsplit("/", 1)[-1].lower()
    slug = re.sub(r"[^a-z0-9]+", "-", tail).strip("-")
    return f"libretexts-{slug}"[:80]


def fetch(client: HttpClient | None = None) -> int:
    client = client or HttpClient()
    result = client.get(SITEMAP_URL)
    if result is None:
        LOG.error("LibreTexts sitemap unreachable")
        return 0

    try:
        root = ET.fromstring(result.text)
    except ET.ParseError as exc:
        LOG.error("sitemap parse failed: %s", exc)
        return 0

    urls: list[str] = []
    for loc in root.iter(f"{SITEMAP_NS}loc"):
        href = (loc.text or "").strip()
        if href and INTEREST_RE.match(href):
            urls.append(href)

    by_subject: dict[str, list[dict]] = {}
    seen: set[str] = set()
    for url in urls:
        try:
            assert_whitelisted(url)
        except Exception as exc:
            LOG.warning("whitelist rejected LibreTexts url %s: %s", url, exc)
            continue

        title = _title_from_url(url)
        subject = tag_subject(title) or "electric-circuits"
        eid = _id_from_url(url)
        if eid in seen:
            continue
        seen.add(eid)

        by_subject.setdefault(subject, []).append({
            "id": eid,
            "title": title,
            "description": f"LibreTexts open textbook shelf: {title}.",
            "sourceId": "libretexts",
            "url": url,
            "subjects": [subject],
            "media": ["textbook", "reference"],
            "level": "ug",
            "authors": [],
            "institution": "LibreTexts Consortium",
            "license": "CC-BY-NC-SA-4.0",
            "licenseUrl": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
            "gateTopics": [],
            "tags": ["textbook"],
        })

    total = 0
    for subject, entries in by_subject.items():
        added, updated = merge_into_subject(subject, entries)
        LOG.info("LibreTexts → %s: +%d / ~%d", subject, added, updated)
        total += added + updated
    return total


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    fetch()
