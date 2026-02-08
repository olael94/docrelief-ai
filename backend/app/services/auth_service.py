from fastapi import HTTPException, status
from typing import Optional
import logging

from app.services.session_store import session_store
from app.services.jwt_service import get_session_id_from_token

logger = logging.getLogger(__name__)


def get_github_token_from_auth(authorization: Optional[str], required: bool = False) -> Optional[str]:
    """
    Extract GitHub token from JWT in Authorization header.

    Args:
        authorization: Authorization header value (Bearer <token>)
        required: If True, raises HTTPException when not authenticated.
                  If False, returns None silently.

    Returns:
        The GitHub token from the session store, or None if not authenticated
        and required is False.

    Raises:
        HTTPException: If required is True and authentication fails.
    """
    if not authorization or not authorization.startswith("Bearer "):
        if required:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated. Please login with GitHub first.",
                headers={"WWW-Authenticate": "Bearer"}
            )
        return None

    token = authorization.replace("Bearer ", "")
    session_id = get_session_id_from_token(token)

    if not session_id:
        if required:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token. Please login again.",
                headers={"WWW-Authenticate": "Bearer"}
            )
        return None

    github_token = session_store.get_github_token(session_id)

    if not github_token:
        if required:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired. Please login again.",
                headers={"WWW-Authenticate": "Bearer"}
            )
        return None

    return github_token
