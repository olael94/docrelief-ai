"""
JWT service for creating and validating tokens.

This module handles JWT creation and validation for session-based authentication.
The JWT contains only the session_id, not the GitHub token itself.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import jwt

from app.config import settings

logger = logging.getLogger(__name__)

# JWT Configuration
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24


def create_access_token(session_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token containing only the session ID.
    
    Args:
        session_id: The session ID to encode in the token
        expires_delta: Optional custom expiration time
        
    Returns:
        str: The encoded JWT token
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    
    payload = {
        "sub": session_id,  # Subject is the session ID
        "exp": expire,      # Expiration time
        "iat": datetime.utcnow(),  # Issued at
        "type": "access"    # Token type
    }
    
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)
    logger.debug(f"[JWT] Created token for session {session_id[:8]}...")
    
    return token


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and validate a JWT access token.
    
    Args:
        token: The JWT token to decode
        
    Returns:
        The decoded payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        
        # Verify it's an access token
        if payload.get("type") != "access":
            logger.warning("[JWT] Invalid token type")
            return None
        
        return payload
        
    except jwt.ExpiredSignatureError:
        logger.debug("[JWT] Token has expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"[JWT] Invalid token: {str(e)}")
        return None


def get_session_id_from_token(token: str) -> Optional[str]:
    """
    Extract the session ID from a JWT token.
    
    Args:
        token: The JWT token
        
    Returns:
        The session ID if token is valid, None otherwise
    """
    payload = decode_access_token(token)
    
    if payload:
        return payload.get("sub")
    
    return None
