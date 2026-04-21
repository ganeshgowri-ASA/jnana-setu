"""Shared primitives for every jnana-setu scraper.

This module implements the three non-negotiable guardrails:

    1. ``assert_whitelisted(url)`` — raises if the URL is not served by one of
       the domains declared in ``sources.yaml``. **Every** fetcher must call
       this before issuing an HTTP request.
    2. ``RobotsChecker`` — caches per-host ``robots.txt`` parse results using
       :mod:`urllib.robotparser`. The default ``HttpClient`` consults it before
       every GET.
    3. ``RateLimiter`` — enforces a per-host cadence of no more than one
       request per second.

Fetchers should also use :func:`merge_into_subject` to persist results — it
reads ``catalog/<subject>.json``, merges by ``id`` (no duplicates), and writes
the file back in stable, sorted JSON.
"""

from __future__ import annotations

import json
import logging
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, Mapping
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import requests
import yaml

LOG = logging.getLogger("jnana_setu.scrapers")

REPO_ROOT = Path(__file__).resolve().parents[1]
SOURCES_YAML = REPO_ROOT / "sources.yaml"
CATALOG_ROOT = REPO_ROOT / "catalog"
USER_AGENT = (
    "jnana-setu/0.1 (+https://github.com/ganeshgowri-asa/jnana-setu) "
    "metadata-only"
)
MIN_INTERVAL_SECONDS = 1.0
REQUEST_TIMEOUT_SECONDS = 20.0


class WhitelistError(RuntimeError):
    """Raised when a URL does not start with any whitelisted base_url."""


class RobotsDisallowed(RuntimeError):
    """Raised when robots.txt disallows a URL for our user-agent."""


@dataclass(frozen=True)
class Source:
    id: str
    name: str
    publisher: str
    homepage: str
    base_urls: tuple[str, ...]
    default_license: str
    api: str | None = None
    search: str | None = None
    sitemap: str | None = None
    notes: str | None = None


@dataclass(frozen=True)
class Whitelist:
    sources: tuple[Source, ...]
    url_blacklist: tuple[str, ...]

    def base_urls(self) -> tuple[str, ...]:
        return tuple(u for s in self.sources for u in s.base_urls)

    def by_id(self, source_id: str) -> Source:
        for s in self.sources:
            if s.id == source_id:
                return s
        raise KeyError(source_id)


_whitelist_cache: Whitelist | None = None


def load_whitelist(path: Path | None = None) -> Whitelist:
    """Load and cache ``sources.yaml``."""
    global _whitelist_cache
    if _whitelist_cache is not None and path is None:
        return _whitelist_cache

    data = yaml.safe_load((path or SOURCES_YAML).read_text(encoding="utf-8"))
    sources = tuple(
        Source(
            id=s["id"],
            name=s["name"],
            publisher=s["publisher"],
            homepage=s["homepage"],
            base_urls=tuple(s["base_urls"]),
            default_license=s["default_license"],
            api=s.get("api"),
            search=s.get("search"),
            sitemap=s.get("sitemap"),
            notes=s.get("notes"),
        )
        for s in data["sources"]
    )
    whitelist = Whitelist(
        sources=sources,
        url_blacklist=tuple(data.get("url_blacklist", [])),
    )
    if path is None:
        _whitelist_cache = whitelist
    return whitelist


def assert_whitelisted(url: str, whitelist: Whitelist | None = None) -> None:
    """Raise :class:`WhitelistError` if ``url`` is not allowed.

    A URL is allowed iff:
      * it begins with one of the ``base_urls`` in ``sources.yaml``, **and**
      * it contains none of the ``url_blacklist`` substrings.
    """
    wl = whitelist or load_whitelist()
    if not url or not url.lower().startswith(("http://", "https://")):
        raise WhitelistError(f"URL is not http(s): {url!r}")

    for bad in wl.url_blacklist:
        if bad in url.lower():
            raise WhitelistError(f"blacklisted substring {bad!r} in URL {url!r}")

    for base in wl.base_urls():
        if url.startswith(base):
            return
    raise WhitelistError(f"URL {url!r} is not under any whitelisted base_url")


class RobotsChecker:
    """Per-host ``robots.txt`` cache using :mod:`urllib.robotparser`."""

    def __init__(self, user_agent: str = USER_AGENT) -> None:
        self._cache: dict[str, RobotFileParser] = {}
        self._lock = threading.Lock()
        self.user_agent = user_agent

    def allows(self, url: str) -> bool:
        parser = self._get(url)
        if parser is None:
            return True  # missing robots.txt → assume allowed
        return parser.can_fetch(self.user_agent, url)

    def _get(self, url: str) -> RobotFileParser | None:
        parsed = urlparse(url)
        origin = f"{parsed.scheme}://{parsed.netloc}"
        with self._lock:
            if origin in self._cache:
                return self._cache[origin] or None
            rp = RobotFileParser()
            rp.set_url(f"{origin}/robots.txt")
            try:
                rp.read()
                self._cache[origin] = rp
            except Exception as exc:  # network / parse errors
                LOG.warning("robots.txt unreachable for %s: %s", origin, exc)
                self._cache[origin] = None  # type: ignore[assignment]
                return None
            return rp


class RateLimiter:
    """Sleep-based per-host rate limit (default: 1 req/s)."""

    def __init__(self, min_interval: float = MIN_INTERVAL_SECONDS) -> None:
        self.min_interval = min_interval
        self._last: dict[str, float] = {}
        self._lock = threading.Lock()

    def wait(self, url: str) -> None:
        host = urlparse(url).netloc
        with self._lock:
            previous = self._last.get(host, 0.0)
            now = time.monotonic()
            wait_for = self.min_interval - (now - previous)
            if wait_for > 0:
                time.sleep(wait_for)
            self._last[host] = time.monotonic()


@dataclass
class FetchResult:
    status_code: int
    url: str
    text: str
    json_data: object | None

    def json(self) -> object | None:
        return self.json_data


@dataclass
class HttpClient:
    """Thin wrapper around :mod:`requests` with all guardrails baked in.

    Every call:
      1. asserts whitelisting,
      2. checks robots.txt,
      3. rate-limits to the configured cadence,
      4. catches timeouts / 404s and returns ``None`` instead of raising — so
         a single 404 never crashes the orchestrator.
    """

    whitelist: Whitelist = field(default_factory=load_whitelist)
    robots: RobotsChecker = field(default_factory=RobotsChecker)
    limiter: RateLimiter = field(default_factory=RateLimiter)
    session: requests.Session = field(
        default_factory=lambda: _build_session()
    )

    def get(
        self,
        url: str,
        *,
        params: Mapping[str, str] | None = None,
        accept_json: bool = False,
    ) -> FetchResult | None:
        """GET ``url``. Returns ``None`` on any skippable error.

        Skippable errors: timeout, connection refused, 4xx, 5xx, robots
        disallow. All are logged at WARNING level.
        """
        assert_whitelisted(url, self.whitelist)
        if not self.robots.allows(url):
            LOG.warning("robots.txt disallows %s — skipping", url)
            return None
        self.limiter.wait(url)
        try:
            resp = self.session.get(
                url,
                params=dict(params) if params else None,
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
        except requests.RequestException as exc:
            LOG.warning("request failed for %s: %s", url, exc)
            return None
        if resp.status_code >= 400:
            LOG.warning("HTTP %s for %s", resp.status_code, url)
            return None

        json_data: object | None = None
        if accept_json:
            try:
                json_data = resp.json()
            except ValueError:
                LOG.warning("expected JSON from %s but got non-JSON body", url)
                return None
        return FetchResult(
            status_code=resp.status_code,
            url=resp.url,
            text=resp.text,
            json_data=json_data,
        )


def _build_session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": USER_AGENT, "Accept-Language": "en"})
    return s


# ---------- catalog I/O ----------

def _catalog_path(subject_slug: str) -> Path:
    return CATALOG_ROOT / f"{subject_slug}.json"


def load_subject(subject_slug: str) -> list[dict]:
    path = _catalog_path(subject_slug)
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def merge_into_subject(
    subject_slug: str,
    new_entries: Iterable[dict],
) -> tuple[int, int]:
    """Merge ``new_entries`` into ``catalog/<subject_slug>.json`` by ``id``.

    Returns ``(added, updated)``. Existing entries are updated in place;
    new ones appended. The final file is sorted by id for deterministic diffs.
    """
    existing = {e["id"]: e for e in load_subject(subject_slug)}
    added = 0
    updated = 0
    for entry in new_entries:
        eid = entry["id"]
        if eid in existing:
            if existing[eid] != entry:
                existing[eid] = {**existing[eid], **entry}
                updated += 1
        else:
            existing[eid] = entry
            added += 1

    CATALOG_ROOT.mkdir(parents=True, exist_ok=True)
    merged = sorted(existing.values(), key=lambda e: e["id"])
    _catalog_path(subject_slug).write_text(
        json.dumps(merged, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return added, updated
