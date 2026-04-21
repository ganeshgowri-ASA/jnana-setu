"""Run every scraper in sequence.

Each scraper is called inside a try/except so one failing source never takes
the whole run down. Exit code is always 0 unless the orchestrator itself
crashes — CI should treat a partial result as "needs review", not "broken".
"""

from __future__ import annotations

import argparse
import logging
import sys
import time
from collections.abc import Callable

from . import gate_papers, libretexts, mit_ocw, nptel, openstax
from .base import HttpClient

LOG = logging.getLogger("jnana_setu.orchestrator")

SCRAPERS: dict[str, Callable[[HttpClient], int]] = {
    "nptel": lambda c: nptel.fetch(c),
    "mit-ocw": lambda c: mit_ocw.fetch(c),
    "openstax": lambda c: openstax.fetch(c),
    "libretexts": lambda c: libretexts.fetch(c),
    "gate-papers": lambda c: gate_papers.fetch(c),
}


def run(selected: list[str]) -> int:
    client = HttpClient()
    start = time.monotonic()
    summary: list[tuple[str, int | None, str]] = []

    for name in selected:
        runner = SCRAPERS.get(name)
        if runner is None:
            LOG.error("no such scraper: %s", name)
            summary.append((name, None, "unknown"))
            continue
        LOG.info("--- running %s ---", name)
        try:
            count = runner(client)
            summary.append((name, count, "ok"))
        except Exception as exc:  # never crash the orchestrator
            LOG.exception("scraper %s failed: %s", name, exc)
            summary.append((name, None, f"error: {exc}"))

    elapsed = time.monotonic() - start
    LOG.info("--- summary (%.1fs) ---", elapsed)
    for name, count, status in summary:
        LOG.info("  %-12s %s  (%s)", name, count if count is not None else "—", status)

    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Run jnana-setu scrapers")
    parser.add_argument(
        "scrapers",
        nargs="*",
        default=list(SCRAPERS.keys()),
        help="names to run (default: all)",
    )
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )
    return run(args.scrapers)


if __name__ == "__main__":
    sys.exit(main())
