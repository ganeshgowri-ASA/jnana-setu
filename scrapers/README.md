# scrapers/

Python fetchers that populate `catalog/<subject>.json` from each whitelisted
source in `sources.yaml`. They replace the n8n stubs for anything the web
app itself cares about; n8n is kept only for the optional link-health
workflow.

## Guardrails

Every request goes through `base.HttpClient`, which:

1. Calls `assert_whitelisted(url)` — fails fast if the URL is not under any
   `base_url` from `sources.yaml`, or contains a blacklisted substring.
2. Consults `robots.txt` for the host via `urllib.robotparser`.
3. Rate-limits to **1 request / second / host**.
4. Catches every `RequestException` (timeouts, DNS errors, 4xx, 5xx) and
   returns `None` — a single failure never crashes the orchestrator.

If you add a new scraper, reuse `HttpClient` and `merge_into_subject` — do
not write to `catalog/` directly.

## Running

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r scrapers/requirements.txt

# Run everything
python -m scrapers.orchestrator

# Or a single source
python -m scrapers.orchestrator nptel openstax
```

Each run is idempotent: entries are merged by `id`, the output file is
re-written with sorted keys so diffs stay small, and nothing is ever
removed by a scraper (that's a reviewer's decision).

## Sources

| Script | Source | What it extracts |
| --- | --- | --- |
| `nptel.py` | `https://nptel.ac.in/api/courses` | EE course id, title, instructors, institute, playlist URL |
| `mit_ocw.py` | EECS department search page | Course slug, title, year (from URL) |
| `openstax.py` | OpenStax CMS books API | Books tagged physics / engineering / math, CC BY only |
| `libretexts.py` | `eng.libretexts.org/sitemap.xml` | Electronics / EM bookshelf pages |
| `gate_papers.py` | IITK / IISc / IITB archive pages | Official EE paper + answer-key PDF links (no mirror) |

## Adding a source

1. Add the entry to `sources.yaml` (id, base_urls, default_license). Open a
   PR — this requires manual review against `LICENSING.md`.
2. Add a module `scrapers/<source>.py` exporting `fetch(client)`.
3. Register it in `orchestrator.SCRAPERS`.
4. Scrape only metadata the source publishes under its declared license.
