"""The two tables of `_config/asset-rules.md` the API reads: what later stages receive (section 7) and the
families shown on screen (section 8). Read on every call, so the analyst can refine them without a code change."""

import os
import re
from pathlib import Path

RULES = Path(os.getenv("ASSET_RULES_FILE", Path(__file__).resolve().parents[2] / "tara-workspace" / "web-based-tara" / "_config" / "asset-rules.md"))
PROPERTIES = ("C", "I", "A", "Au", "Az", "NR")
FULL_NAMES = {
    "C": "confidentiality", "I": "integrity", "A": "availability",
    "Au": "authenticity", "Az": "authorization", "NR": "non_repudiation",
}


def table_after(heading: str) -> list[list[str]]:
    lines = RULES.read_text(encoding="utf-8").splitlines()
    start = next((i for i, line in enumerate(lines) if line.startswith(heading)), None)
    if start is None:
        return []
    rows = []
    for line in lines[start + 1:]:
        if line.startswith("## "):
            break
        if not line.strip().startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if cells and not re.fullmatch(r"-+", cells[0].replace(" ", "")):
            rows.append(cells)
    return rows[1:]  # without the header row


def register_types() -> dict[str, str]:
    return {prefix: kind for prefix, kind, *_ in table_after("## 7.")}


def families() -> list[dict]:
    return [{"code": prefix, "name": name} for prefix, name, *_ in table_after("## 8.")]
