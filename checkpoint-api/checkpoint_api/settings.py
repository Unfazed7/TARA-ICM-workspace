"""Server switches read from the environment at request time, so a changed `.env` only needs a restart (D-67)."""

import os

from fastapi import HTTPException, status

AI_OFF_MESSAGE = "AI is switched off in this preview."
_FALSE = {"0", "false", "no", "off"}


def ai_enabled() -> bool:
    """`AI_ENABLED=false` switches off everything that calls a model. The default is on."""
    return os.getenv("AI_ENABLED", "true").strip().lower() not in _FALSE


def is_admin(claims: dict | None) -> bool:
    return bool(claims) and claims.get("role") == "admin"


def ai_enabled_for(claims: dict | None) -> bool:
    """AI is on for everyone, or, with the switch off, for admins only (D-70)."""
    return ai_enabled() or is_admin(claims)


def preview_only(claims: dict | None) -> bool:
    """With AI switched off and the demo offered, everyone but an admin sees the demo only (D-70)."""
    return not ai_enabled() and demo_enabled() and bool(claims) and not is_admin(claims) and claims.get("role") != "service"


def require_ai(claims: dict | None = None) -> None:
    """Guards the endpoints that start a model run. Pure maths (the engines, folder 08 after an edit) is not guarded."""
    if not ai_enabled_for(claims):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=AI_OFF_MESSAGE)


def demo_enabled() -> bool:
    """The demo TARA is offered when AI is off. `DEMO_ENABLED` overrides that either way."""
    value = os.getenv("DEMO_ENABLED", "").strip().lower()
    if value in {"1", "true", "yes", "on"}:
        return True
    if value in {"0", "false", "no", "off"}:
        return False
    return not ai_enabled()
