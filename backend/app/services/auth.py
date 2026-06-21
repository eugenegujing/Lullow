"""Authentication service backed by the profile Redis DB."""
from __future__ import annotations

import hashlib
import hmac
import secrets
from typing import Optional

from ..config import settings
from ..integrations.redis_profile_client import profile_redis_client

_HASH_NAME = "sha256"
_ITERATIONS = 210_000


def _user_key(username: str) -> str:
    return f"user:{username.strip().lower()}"


def _session_key(token: str) -> str:
    return f"session:{token}"


def hash_password(password: str, salt_hex: str | None = None) -> str:
    """Return a portable PBKDF2 password hash string."""
    salt = bytes.fromhex(salt_hex) if salt_hex else secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        _HASH_NAME,
        password.encode("utf-8"),
        salt,
        _ITERATIONS,
    )
    return f"pbkdf2_{_HASH_NAME}${_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a plaintext password against a stored PBKDF2 hash."""
    try:
        algo, iterations_raw, salt_hex, expected_hex = stored_hash.split("$", 3)
        if algo != f"pbkdf2_{_HASH_NAME}":
            return False
        iterations = int(iterations_raw)
        digest = hashlib.pbkdf2_hmac(
            _HASH_NAME,
            password.encode("utf-8"),
            bytes.fromhex(salt_hex),
            iterations,
        )
        return hmac.compare_digest(digest.hex(), expected_hex)
    except Exception:
        return False


def create_user(username: str, password: str, child_id: str) -> dict:
    """Create or replace a demo/application user in Redis."""
    record = {
        "username": username.strip().lower(),
        "password_hash": hash_password(password),
        "child_id": child_id,
    }
    profile_redis_client.set_json(_user_key(username), record)
    return record


def get_user(username: str) -> Optional[dict]:
    """Return the stored user record, if present."""
    return profile_redis_client.get_json(_user_key(username))


def authenticate(username: str, password: str) -> Optional[dict]:
    """Return user record when credentials are valid; otherwise None."""
    user = get_user(username)
    if not user:
        return None
    if not verify_password(password, user.get("password_hash", "")):
        return None
    return user


def create_session(user: dict) -> tuple[str, int]:
    """Create a Redis-backed bearer session token."""
    token = secrets.token_urlsafe(32)
    ttl = settings.session_ttl_seconds
    profile_redis_client.set_json(
        _session_key(token),
        {
            "username": user["username"],
            "child_id": user["child_id"],
        },
        ttl_seconds=ttl,
    )
    return token, ttl


def get_session(token: str) -> Optional[dict]:
    """Return session payload for a bearer token, if valid."""
    if not token:
        return None
    return profile_redis_client.get_json(_session_key(token))


def delete_session(token: str) -> None:
    """Delete a bearer session token."""
    if token:
        profile_redis_client.delete(_session_key(token))


def seed_demo_user() -> None:
    """Seed a demo parent login when no configured demo user exists."""
    if get_user(settings.demo_username):
        return
    create_user(
        username=settings.demo_username,
        password=settings.demo_password,
        child_id=settings.demo_child_id,
    )
