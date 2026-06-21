"""Shared FastAPI dependencies."""
from __future__ import annotations

from fastapi import Header, HTTPException

from .services import auth as auth_service


def _bearer_token(authorization: str | None) -> str:
    if not authorization:
        return ""
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer":
        return ""
    return token.strip()


def require_auth(authorization: str | None = Header(default=None)) -> dict:
    """Require a valid Redis-backed bearer session."""
    session = auth_service.get_session(_bearer_token(authorization))
    if session is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return session
