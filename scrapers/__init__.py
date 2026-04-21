"""jnana-setu scrapers.

Legal guardrails:
    - Every outbound request goes through `base.HttpClient`, which calls
      `base.assert_whitelisted(url)` first. A request to a non-whitelisted host
      raises before any network traffic.
    - Every request additionally consults robots.txt via urllib.robotparser.
    - Each host is rate-limited to <= 1 request per second.
    - We only extract *metadata* (title, URL, license) that the upstream site
      itself publishes. We never download PDFs, videos, or book contents.
"""
