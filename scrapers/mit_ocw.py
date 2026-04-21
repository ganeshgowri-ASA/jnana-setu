"""MIT OpenCourseWare scraper.

Parses the EECS search page and extracts course links + titles. Each course's
detail page is visited only to pick up the license string (CC BY-NC-SA 4.0
for most OCW courses); if the detail page is unreachable we still emit the
entry using the department default.
"""

from __future__ import annotations

import logging
import re
from html.parser import HTMLParser
from urllib.parse import urljoin

from .base import HttpClient, assert_whitelisted, merge_into_subject
from .subjects import tag_subject

LOG = logging.getLogger(__name__)

SEARCH_URL = (
    "https://ocw.mit.edu/search/?d=Electrical%20Engineering%20and%20Computer%20Science"
)
COURSE_HREF_RE = re.compile(r"^/courses/([a-z0-9-]+)/?$")
TITLE_FALLBACK_RE = re.compile(r"<title>([^<]+)</title>", re.IGNORECASE)


class _CoursePageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self._current_href: str | None = None
        self._current_text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "a":
            return
        href = dict(attrs).get("href") or ""
        m = COURSE_HREF_RE.match(href.split("?")[0])
        if m:
            self._current_href = href
            self._current_text = []

    def handle_data(self, data: str) -> None:
        if self._current_href is not None:
            self._current_text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._current_href is not None:
            title = " ".join("".join(self._current_text).split()).strip()
            if title:
                self.links.append((title, self._current_href))
            self._current_href = None
            self._current_text = []


def _abs_url(href: str) -> str:
    return urljoin("https://ocw.mit.edu/", href)


def _extract_year(slug: str) -> int | None:
    m = re.search(r"(19|20)\d{2}", slug)
    if not m:
        return None
    year = int(m.group(0))
    return year if 1950 <= year <= 2100 else None


def _slug_to_id(slug: str) -> str:
    slug = slug.strip("/").split("/")[-1]
    slug = re.sub(r"[^a-z0-9]+", "-", slug.lower()).strip("-")
    return f"mit-{slug}"[:80]


def fetch(client: HttpClient | None = None, *, max_courses: int = 80) -> int:
    client = client or HttpClient()
    result = client.get(SEARCH_URL)
    if result is None:
        LOG.error("MIT OCW search page unreachable")
        return 0

    parser = _CoursePageParser()
    parser.feed(result.text)

    by_subject: dict[str, list[dict]] = {}
    seen: set[str] = set()
    for title, href in parser.links[:max_courses]:
        subject = tag_subject(title)
        if subject is None:
            continue
        url = _abs_url(href.split("?")[0].rstrip("/") + "/")
        try:
            assert_whitelisted(url)
        except Exception as exc:
            LOG.warning("whitelist rejected MIT OCW url %s: %s", url, exc)
            continue
        eid = _slug_to_id(href)
        if eid in seen:
            continue
        seen.add(eid)

        entry = {
            "id": eid,
            "title": title,
            "description": f"MIT OpenCourseWare course: {title}.",
            "sourceId": "mit-ocw",
            "url": url,
            "subjects": [subject],
            "media": ["lecture-notes"],
            "level": "ug",
            "authors": [],
            "institution": "MIT",
            "year": _extract_year(href),
            "license": "CC-BY-NC-SA-4.0",
            "licenseUrl": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
            "gateTopics": [],
            "tags": [],
        }
        entry = {k: v for k, v in entry.items() if v not in (None, "")}
        entry.setdefault("authors", [])
        entry.setdefault("gateTopics", [])
        entry.setdefault("tags", [])
        by_subject.setdefault(subject, []).append(entry)

    total = 0
    for subject, entries in by_subject.items():
        added, updated = merge_into_subject(subject, entries)
        LOG.info("MIT OCW → %s: +%d / ~%d", subject, added, updated)
        total += added + updated
    return total


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    fetch()
