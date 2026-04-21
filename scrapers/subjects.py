"""Subject tagger — maps free-form course titles to jnana-setu subject slugs.

Used by every scraper that doesn't already know the subject. Keyword matching
is deliberately simple and conservative: a title that matches nothing is
returned as ``None`` so the orchestrator can skip it rather than mis-file it.
"""

from __future__ import annotations

import re
from typing import Final

# Ordered most-specific → least-specific. First hit wins.
_RULES: Final[tuple[tuple[str, tuple[str, ...]], ...]] = (
    ("power-electronics", (
        r"power electronic", r"\bpwm\b", r"converter", r"inverter", r"chopper",
        r"rectifier", r"motor drive",
    )),
    ("power-systems", (
        r"power system", r"transmission", r"distribution", r"grid",
        r"load flow", r"fault analysis", r"protection",
    )),
    ("electrical-machines", (
        r"electric(al)? machine", r"transformer", r"induction motor",
        r"synchronous machine", r"\bdc machine\b",
    )),
    ("control-systems", (
        r"control system", r"control engineering", r"feedback",
        r"root locus", r"state.?space",
    )),
    ("digital-electronics", (
        r"digital electronic", r"digital logic", r"logic design",
        r"microprocessor", r"\bvlsi\b",
    )),
    ("analog-electronics", (
        r"analog electronic", r"electronic device", r"\bedc\b",
        r"\bbjt\b", r"\bmosfet\b", r"amplifier",
    )),
    ("signals-and-systems", (
        r"signal", r"fourier", r"\blti\b", r"\bdsp\b",
        r"digital signal processing",
    )),
    ("electromagnetic-fields", (
        r"electromagnetic", r"\bemft\b", r"maxwell", r"electrostatic",
        r"magnetostatic",
    )),
    ("electric-circuits", (
        r"\bcircuit\b", r"\bnetwork\b", r"kirchhoff",
    )),
    ("electrical-measurements", (
        r"measurement", r"instrumentation",
    )),
    ("engineering-mathematics", (
        r"\bcalculus\b", r"linear algebra", r"probability", r"statistics",
        r"numerical methods", r"differential equation",
    )),
)

_COMPILED: Final = tuple(
    (subject, tuple(re.compile(p, re.IGNORECASE) for p in patterns))
    for subject, patterns in _RULES
)


def tag_subject(title: str) -> str | None:
    """Return the primary subject slug for a course title, or ``None``."""
    if not title:
        return None
    for subject, regexes in _COMPILED:
        for regex in regexes:
            if regex.search(title):
                return subject
    return None
