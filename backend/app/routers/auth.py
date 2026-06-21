"""Authentication router for parent login."""
from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException

from ..models.schemas import AuthLoginRequest, AuthLoginResponse, AuthMeResponse
from ..services import auth as auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _bearer_token(authorization: str | None) -> str:
    if not authorization:
        return ""
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer":
        return ""
    return token.strip()


@router.post("/login", response_model=AuthLoginResponse)
def login(req: AuthLoginRequest) -> AuthLoginResponse:
    """Verify username/password and return a Redis-backed session token."""
    user = auth_service.authenticate(req.username, req.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Wrong username or password")

    token, ttl = auth_service.create_session(user)
    return AuthLoginResponse(
        access_token=token,
        username=user["username"],
        child_id=user["child_id"],
        expires_in=ttl,
    )


@router.post("/logout")
def logout(authorization: str | None = Header(default=None)) -> dict:
    """Delete the current session token if one was provided."""
    token = _bearer_token(authorization)
    auth_service.delete_session(token)
    return {"status": "ok"}


@router.get("/me", response_model=AuthMeResponse)
def me(authorization: str | None = Header(default=None)) -> AuthMeResponse:
    """Return the current session identity."""
    token = _bearer_token(authorization)
    session = auth_service.get_session(token)
    if session is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return AuthMeResponse(username=session["username"], child_id=session["child_id"])
