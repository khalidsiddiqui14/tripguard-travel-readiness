from datetime import datetime, timedelta, timezone

import jwt
from jwt import InvalidTokenError
from pwdlib import PasswordHash

from app.core.config import settings


# Password hashing using Argon2
password_hash = PasswordHash.recommended()

# JWT configuration
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    """Hash a user's password securely."""
    if not password:
        raise ValueError("Password cannot be empty")

    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its stored hash."""
    if not password or not hashed:
        return False

    try:
        return password_hash.verify(password, hashed)
    except (ValueError, TypeError):
        return False


def create_access_token(subject: str) -> str:
    """Create a signed JWT access token."""
    if not subject:
        raise ValueError("Token subject cannot be empty")

    now = datetime.now(timezone.utc)
    expires = now + timedelta(
        minutes=settings.access_token_expire_minutes
    )

    payload = {
        "sub": str(subject),
        "iat": now,
        "exp": expires,
    }

    return jwt.encode(
        payload,
        settings.secret_key,
        algorithm=ALGORITHM,
    )


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT access token."""
    if not token:
        raise InvalidTokenError("Missing access token")

    payload = jwt.decode(
        token,
        settings.secret_key,
        algorithms=[ALGORITHM],
        options={
            "require": ["sub", "exp", "iat"],
        },
    )

    if not isinstance(payload.get("sub"), str) or not payload["sub"].strip():
        raise InvalidTokenError("Invalid token subject")

    return payload
