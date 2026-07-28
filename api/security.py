from __future__ import annotations

import base64
import hashlib
import secrets


PASSWORD_ITERATIONS = 310_000


def hash_password(value: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", value.encode("utf-8"), salt, PASSWORD_ITERATIONS
    )
    return base64.b64encode(salt + digest).decode("ascii")


def check_password(value: str, stored: str) -> bool:
    try:
        raw = base64.b64decode(stored)
        for iterations in (PASSWORD_ITERATIONS, 180_000):
            expected = hashlib.pbkdf2_hmac(
                "sha256", value.encode("utf-8"), raw[:16], iterations
            )
            if secrets.compare_digest(expected, raw[16:]):
                return True
        return False
    except (ValueError, TypeError):
        return False


def new_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
