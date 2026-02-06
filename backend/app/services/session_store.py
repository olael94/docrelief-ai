"""
In-memory session store for GitHub tokens.

This module provides a simple in-memory storage for GitHub OAuth tokens.
Tokens are stored with a session ID (UUID) and can be retrieved later.

WARNING: Data is lost when the server restarts. For production, consider using Redis.
"""
import logging
from typing import Optional, Dict, Any
from uuid import uuid4
from datetime import datetime, timedelta
import threading

logger = logging.getLogger(__name__)


class SessionStore:
    """
    Thread-safe in-memory session store.
    
    Stores GitHub tokens mapped to session IDs with expiration.
    """
    
    def __init__(self, default_ttl_hours: int = 24):
        self._store: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()
        self._default_ttl = timedelta(hours=default_ttl_hours)
        logger.info(f"[SessionStore] Initialized with TTL of {default_ttl_hours} hours")
    
    def create_session(self, github_token: str, user_info: Optional[Dict] = None) -> str:
        """
        Create a new session and store the GitHub token.
        
        Args:
            github_token: The GitHub OAuth access token
            user_info: Optional user information from GitHub
            
        Returns:
            str: The session ID (UUID)
        """
        session_id = str(uuid4())
        expires_at = datetime.utcnow() + self._default_ttl
        
        with self._lock:
            self._store[session_id] = {
                "github_token": github_token,
                "user_info": user_info,
                "created_at": datetime.utcnow(),
                "expires_at": expires_at
            }
        
        logger.info(f"[SessionStore] Created session {session_id[:8]}... (expires at {expires_at})")
        return session_id
    
    def get_github_token(self, session_id: str) -> Optional[str]:
        """
        Retrieve the GitHub token for a session.
        
        Args:
            session_id: The session ID
            
        Returns:
            The GitHub token if found and not expired, None otherwise
        """
        with self._lock:
            session = self._store.get(session_id)
            
            if not session:
                logger.debug(f"[SessionStore] Session {session_id[:8]}... not found")
                return None
            
            # Check expiration
            if datetime.utcnow() > session["expires_at"]:
                logger.info(f"[SessionStore] Session {session_id[:8]}... expired, removing")
                del self._store[session_id]
                return None
            
            return session["github_token"]
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve full session data.
        
        Args:
            session_id: The session ID
            
        Returns:
            The session data if found and not expired, None otherwise
        """
        with self._lock:
            session = self._store.get(session_id)
            
            if not session:
                return None
            
            # Check expiration
            if datetime.utcnow() > session["expires_at"]:
                del self._store[session_id]
                return None
            
            # Return a copy without the token for safety
            return {
                "user_info": session.get("user_info"),
                "created_at": session["created_at"],
                "expires_at": session["expires_at"]
            }
    
    def delete_session(self, session_id: str) -> bool:
        """
        Delete a session (logout).
        
        Args:
            session_id: The session ID
            
        Returns:
            True if session was deleted, False if not found
        """
        with self._lock:
            if session_id in self._store:
                del self._store[session_id]
                logger.info(f"[SessionStore] Deleted session {session_id[:8]}...")
                return True
            return False
    
    def cleanup_expired(self) -> int:
        """
        Remove all expired sessions.
        
        Returns:
            Number of sessions removed
        """
        now = datetime.utcnow()
        removed = 0
        
        with self._lock:
            expired_ids = [
                sid for sid, session in self._store.items()
                if now > session["expires_at"]
            ]
            
            for sid in expired_ids:
                del self._store[sid]
                removed += 1
        
        if removed > 0:
            logger.info(f"[SessionStore] Cleaned up {removed} expired sessions")
        
        return removed
    
    def get_active_sessions_count(self) -> int:
        """Get the number of active sessions."""
        with self._lock:
            return len(self._store)


# Global session store instance
session_store = SessionStore()
