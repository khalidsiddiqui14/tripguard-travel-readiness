from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.database import get_db
from app.models.user import User


# Return authentication errors ourselves instead of automatic 403 responses.
bearer_scheme = HTTPBearer(auto_error=False)


def authentication_error() -> HTTPException:
    """Return a consistent authentication error."""
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Validate JWT and return the authenticated active user."""

    if credentials is None:
        raise authentication_error()

    try:
        payload = decode_access_token(credentials.credentials)

        subject = payload.get("sub")

        if not isinstance(subject, str) or not subject.isdigit():
            raise authentication_error()

        user_id = int(subject)

        if user_id <= 0:
            raise authentication_error()

    except (InvalidTokenError, ValueError, TypeError, OverflowError):
        raise authentication_error()

    user = db.get(User, user_id)

    if user is None or not user.is_active:
        raise authentication_error()

    return user


def require_admin(
    user: User = Depends(get_current_user),
) -> User:
    """Allow access only to administrators."""

    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required",
        )

    return user


def require_employee(
    user: User = Depends(get_current_user),
) -> User:
    """Allow access only to employee accounts."""

    if user.role != "employee":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee access required",
        )

    return user
