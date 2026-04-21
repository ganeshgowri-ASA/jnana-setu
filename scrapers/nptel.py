"""NPTEL scraper.

Pulls the public courses JSON, filters to Electrical Engineering, tags the
subject from the course title, and merges into the per-subject catalog files.

We do NOT download video files. We only record metadata and the public
playlist URL that NPTEL itself publishes on nptel.ac.in.
"""

from __future__ import annotations

import logging
from collections.abc import Iterable

from .base import HttpClient, assert_whitelisted, load_whitelist, merge_into_subject
from .subjects import tag_subject

LOG = logging.getLogger(__name__)

NPTEL_COURSES_API = "https://nptel.ac.in/api/courses"
DEFAULT_LICENSE = "CC-BY-SA-4.0"
DEFAULT_LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/"


def course_url(course_id: str) -> str:
    return f"https://nptel.ac.in/courses/{course_id}"


def _as_list(v: object) -> list[str]:
    if isinstance(v, list):
        return [str(x) for x in v if x]
    if isinstance(v, str) and v:
        return [v]
    return []


def _normalize(course: dict) -> dict | None:
    """Turn a raw NPTEL API row into a catalog entry.

    Returns ``None`` if the course isn't EE-relevant or subject-tagging fails.
    """
    discipline = (course.get("discipline") or "").lower()
    if "electrical" not in discipline and course.get("branch") != "EE":
        return None

    title = (course.get("course_name") or course.get("title") or "").strip()
    course_id = str(course.get("course_id") or course.get("id") or "").strip()
    if not title or not course_id:
        return None

    subject = tag_subject(title)
    if subject is None:
        LOG.info("skipping NPTEL %s — no subject match for %r", course_id, title)
        return None

    url = course_url(course_id)
    try:
        assert_whitelisted(url)
    except Exception as exc:
        LOG.warning("whitelist rejected NPTEL url %s: %s", url, exc)
        return None

    return {
        "id": f"nptel-{course_id}",
        "title": title,
        "description": (course.get("abstract") or title)[:800],
        "sourceId": "nptel",
        "url": url,
        "subjects": [subject],
        "media": ["video-lectures"],
        "level": "gate",
        "authors": _as_list(course.get("instructors") or course.get("faculty")),
        "institution": course.get("institute") or course.get("coordinator_inst") or "",
        "year": _first_int(course.get("year") or course.get("first_year")),
        "license": DEFAULT_LICENSE,
        "licenseUrl": DEFAULT_LICENSE_URL,
        "gateTopics": [],
        "tags": ["video"],
    }


def _first_int(v: object) -> int | None:
    try:
        return int(str(v)[:4])
    except (TypeError, ValueError):
        return None


def fetch(client: HttpClient | None = None) -> int:
    """Run the NPTEL scraper end-to-end; returns number of entries written."""
    client = client or HttpClient()
    load_whitelist()  # prime the cache; also verifies sources.yaml parses

    result = client.get(
        NPTEL_COURSES_API,
        params={"discipline": "Electrical Engineering"},
        accept_json=True,
    )
    if result is None:
        LOG.error("NPTEL API unreachable — no entries written")
        return 0

    payload = result.json()
    raw_courses: Iterable[dict] = []
    if isinstance(payload, dict):
        for key in ("courses", "data", "results", "items"):
            value = payload.get(key)
            if isinstance(value, list):
                raw_courses = value
                break
    elif isinstance(payload, list):
        raw_courses = payload

    by_subject: dict[str, list[dict]] = {}
    for row in raw_courses:
        if not isinstance(row, dict):
            continue
        entry = _normalize(row)
        if entry is None:
            continue
        by_subject.setdefault(entry["subjects"][0], []).append(entry)

    total = 0
    for subject, entries in by_subject.items():
        added, updated = merge_into_subject(subject, entries)
        LOG.info("NPTEL → %s: +%d / ~%d", subject, added, updated)
        total += added + updated
    return total


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    fetch()
