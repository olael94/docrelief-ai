from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.session import Session
from datetime import datetime, timedelta
import secrets
import logging
import traceback

logger = logging.getLogger(__name__)


async def get_or_create_anonymous_session(
    db: AsyncSession, 
    session_id: int = None
) -> Session:
    """
    Gets an existing session by ID or creates a new anonymous session.
    
    Args:
        db: Database session
        session_id: Optional session ID to retrieve existing session
        
    Returns:
        Session: Existing or newly created session
    """
    try:
        if session_id:
            # Try to get existing session
            logger.debug(f"[Session] Attempting to retrieve existing session: {session_id}")
            try:
                result = await db.execute(
                    select(Session).where(Session.id == session_id)
                )
                session = result.scalar_one_or_none()
                
                if session:
                    # Update last_active timestamp
                    logger.debug(f"[Session] Found existing session, updating last_active")
                    session.last_active = datetime.utcnow()
                    await db.commit()
                    logger.debug(f"[Session] Retrieved existing session: {session_id}")
                    return session
                else:
                    logger.warning(f"[Session] Session {session_id} not found, creating new anonymous session")
            except Exception as e:
                logger.error(f"[Session] Error retrieving session {session_id}: {str(e)}")
                logger.error(f"[Session] Error type: {type(e).__name__}")
                logger.error(f"[Session] Traceback: {traceback.format_exc()}")
                raise
        
        # Create new anonymous session
        logger.debug("[Session] Creating new anonymous session")
        session_token = secrets.token_urlsafe(32)
        now = datetime.utcnow()
        expires_at = now + timedelta(hours=24)
        
        new_session = Session(
            session_token=session_token,
            user_id=None,  # Anonymous session
            created_at=now,
            last_active=now,
            expires_at=expires_at
        )
        
        logger.debug("[Session] Adding new session to database")
        db.add(new_session)
        
        logger.debug("[Session] Committing new session to database")
        await db.commit()
        
        logger.debug("[Session] Refreshing new session from database")
        await db.refresh(new_session)
        
        logger.info(f"[Session] Created new anonymous session: {new_session.id}")
        return new_session
        
    except Exception as e:
        logger.error(f"[Session] ===== Error in get_or_create_anonymous_session =====")
        logger.error(f"[Session] Error message: {str(e)}")
        logger.error(f"[Session] Error type: {type(e).__name__}")
        logger.error(f"[Session] Error args: {e.args}")
        logger.error(f"[Session] Full traceback:")
        logger.error(traceback.format_exc())
        
        # Check if it's a connection error
        error_str = str(e).lower()
        if "connection refused" in error_str or "errno 61" in error_str:
            logger.error("[Session] Connection refused - PostgreSQL may not be running")
        elif "could not connect" in error_str:
            logger.error("[Session] Could not connect to database")
        elif "timeout" in error_str:
            logger.error("[Session] Database connection timeout")
        
        raise
