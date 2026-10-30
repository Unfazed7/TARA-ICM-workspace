"""The API's way into the pipeline's own engines (D-62): one small Node program, never a copy of the maths in Python."""

import json
import shutil
import subprocess
from functools import lru_cache
from pathlib import Path


HELPER = Path(__file__).resolve().parent / "node_helpers" / "engines.js"
REPO = Path(__file__).resolve().parents[2]


class EngineError(Exception):
    pass


def call(command: str, payload=None):
    node = shutil.which("node")
    if node is None:
        raise EngineError("Node.js was not found on this computer's PATH.")
    done = subprocess.run(
        [node, str(HELPER), command],
        input=None if payload is None else json.dumps(payload).encode(),
        capture_output=True,
        cwd=str(REPO),
        timeout=120,
    )
    if done.returncode != 0:
        raise EngineError(done.stderr.decode(errors="replace").strip() or f"The engine helper stopped with code {done.returncode}.")
    return json.loads(done.stdout.decode())


@lru_cache(maxsize=1)
def scales() -> dict:
    return call("scales")


def cvss_number(metrics: dict) -> float:
    """8.22 x AV x AC x PR x UI with the engine's own weights, as the legend states it."""
    w = scales()["weights"]
    value = 8.22 * w["AV"][metrics["attack_vector"]] * w["AC"][metrics["attack_complexity"]] * w["PR"][metrics["privileges_required"]] * w["UI"][metrics["user_interaction"]]
    return round(value, 2)


def afr(metrics_list: list) -> list:
    return call("afr", metrics_list) if metrics_list else []


_IMPACT_CACHE: dict[str, list] = {}


def impact_ratings(impacts: list) -> list:
    """The overall impact rating of each folder 07 record, from the engine. Cached by what it is computed from."""
    if not impacts:
        return []
    key = json.dumps([[i["impact_id"], i["tool_user"], i["other_stakeholders"]] for i in impacts], sort_keys=True)
    if key not in _IMPACT_CACHE:
        if len(_IMPACT_CACHE) > 64:
            _IMPACT_CACHE.clear()
        _IMPACT_CACHE[key] = call("impact", impacts)
    return _IMPACT_CACHE[key]
