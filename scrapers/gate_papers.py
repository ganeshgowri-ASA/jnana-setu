"""Official GATE EE past-papers scraper.

Walks the archive pages of the GATE-organising IITs, extracts the
EE paper / answer-key PDF links, and emits one catalog entry per
(year, paper-or-key) pair. We NEVER download the PDF — only link to it on
the organising IIT's domain, which is what gate.iitk.ac.in and its peers
already serve to everyone.
"""

from __future__ import annotations

import logging
import re
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

from .base import HttpClient, assert_whitelisted, merge_into_subject

LOG = logging.getLogger(__name__)

ARCHIVES: tuple[str, ...] = (
    "https://gate.iitk.ac.in/previous-papers.html",
    "https://gate.iisc.ac.in/previous-papers/",
    "https://gate.iitb.ac.in/previous-papers.html",
)

EE_HINT_RE = re.compile(r"\b(EE|Electrical|Electrical\s+Engineering)\b", re.I)
YEAR_RE = re.compile(r"\b(19|20)\d{2}\b")
ANSWER_KEY_RE = re.compile(r"answer[-\s]?key|key", re.I)
PDF_RE = re.compile(r"\.pdf($|\?)", re.I)

# These archive pages are catalog-style — they cover every EE subject — so
# we file the master entry under engineering-mathematics, which is the first
# entry in data/subjects.json. Per-paper entries carry all 12 subjects.
ALL_EE_SUBJECTS = (
    "engineering-mathematics",
    "electric-circuits",
    "electromagnetic-fields",
    "signals-and-systems",
    "electrical-machines",
    "power-systems",
    "control-systems",
    "electrical-measurements",
    "analog-electronics",
    "digital-electronics",
    "power-electronics",
    "general-aptitude",
)


class _PdfLinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self._href: str | None = None
        self._text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "a":
            return
        href = dict(attrs).get("href") or ""
        if PDF_RE.search(href):
            self._href = href
            self._text = []

    def handle_data(self, data: str) -> None:
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._href is not None:
            text = " ".join("".join(self._text).split()).strip()
            self.links.append((text, self._href))
            self._href = None
            self._text = []


def _scrape_archive(client: HttpClient, archive_url: str) -> list[dict]:
    """Return normalized catalog entries scraped from a single archive page."""
    result = client.get(archive_url)
    if result is None:
        LOG.warning("archive unreachable, skipping: %s", archive_url)
        return []

    origin = f"{urlparse(archive_url).scheme}://{urlparse(archive_url).netloc}"
    parser = _PdfLinkParser()
    parser.feed(result.text)

    entries: list[dict] = []
    for text, href in parser.links:
        absolute = urljoin(archive_url, href)
        try:
            assert_whitelisted(absolute)
        except Exception:
            # third-party mirror or off-domain CDN — skip silently
            continue

        # Heuristic EE filter: link text or filename must mention EE.
        haystack = f"{text} {href}"
        if not EE_HINT_RE.search(haystack):
            continue

        year_match = YEAR_RE.search(haystack)
        if not year_match:
            continue
        year = int(year_match.group(0))

        is_key = bool(ANSWER_KEY_RE.search(haystack))
        host = urlparse(origin).netloc.split(".")[1]  # iitk, iisc, iitb
        kind = "key" if is_key else "paper"
        eid = f"gate-ee-{year}-{kind}-{host}"

        title_suffix = "Answer Key" if is_key else "Question Paper"
        entries.append({
            "id": eid,
            "title": f"GATE EE {year} {title_suffix} (official, {host.upper()})",
            "description": (
                f"Official GATE Electrical Engineering {title_suffix.lower()} "
                f"for {year}, hosted by {host.upper()}. Link only — not mirrored."
            ),
            "sourceId": "gate-iit",
            "url": absolute,
            "subjects": list(ALL_EE_SUBJECTS),
            "media": ["past-paper"],
            "level": "gate",
            "authors": [],
            "institution": "IIT (organising institute)",
            "year": year,
            "license": "Official-Free-Access",
            "gateTopics": [],
            "tags": ["past-paper", "official", kind],
        })
    return entries


def fetch(client: HttpClient | None = None) -> int:
    client = client or HttpClient()
    # Every scraped paper belongs to every EE subject (past papers cover the
    # whole syllabus), so we file them under the primary bucket:
    # engineering-mathematics.json. The Next.js loader exposes them under
    # every subject page via the subjects[] array.
    all_entries: list[dict] = []
    for archive_url in ARCHIVES:
        entries = _scrape_archive(client, archive_url)
        LOG.info("GATE archive %s → %d entries", archive_url, len(entries))
        all_entries.extend(entries)

    if not all_entries:
        return 0

    added, updated = merge_into_subject("engineering-mathematics", all_entries)
    LOG.info("GATE papers → engineering-mathematics: +%d / ~%d", added, updated)
    return added + updated


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    fetch()
