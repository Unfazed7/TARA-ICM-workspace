"""The public settings the screens need, and the demo TARA's working copies (D-67)."""

import re

import jwt
from fastapi import APIRouter, Body, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from .. import demo
from .. import stage_models as m
from ..database import get_db
from ..settings import ai_enabled_for, demo_enabled, preview_only
from .assessments import current_user_id, is_admin
from .auth import decode_token, get_current_claims


router = APIRouter()
SESSION_KEY = re.compile(r"^[A-Za-z0-9_-]{8,80}$")


def offered() -> bool:
    return demo_enabled() and demo.available()


def optional_claims(request: Request) -> dict | None:
    """The login's claims when a valid token came with the call; none otherwise (the login page asks before there is one)."""
    header = request.headers.get("authorization") or ""
    if not header.lower().startswith("bearer "):
        return None
    try:
        return decode_token(header[7:].strip())
    except jwt.PyJWTError:
        return None


@router.get("/config")
def config(claims: dict | None = Depends(optional_claims)):
    """What the screens need: is AI on for this login, is the demo offered, and is this login limited to the demo (D-70)."""
    return {"ai_enabled": ai_enabled_for(claims), "demo_available": offered(), "preview_only": preview_only(claims)}


@router.post("/demo/session")
def open_session(body: dict = Body(...), claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    if claims.get("role") == "service":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="The demo is for people who log in.")
    if not offered():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This server has no demo.")
    key = str(body.get("session_key") or "")
    if not SESSION_KEY.match(key):
        raise HTTPException(status_code=422, detail="The session key is missing or not valid.")
    return {"assessment_id": demo.open_copy(db, current_user_id(claims), key)}


@router.delete("/demo/session/{assessment_id}", status_code=status.HTTP_204_NO_CONTENT)
def close_session(assessment_id: str, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    row = db.query(m.DemoCopy).filter_by(assessment_id=assessment_id).first()
    if row is None or (row.owner_id != current_user_id(claims) and not is_admin(claims)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demo copy not found")
    demo.delete_copy(db, assessment_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
