from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.session import Session
from datetime import datetime, timedelta
import secrets
import logging

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
    if session_id:
        # Try to get existing session
        result = await db.execute(
            select(Session).where(Session.id == session_id)
        )
        session = result.scalar_one_or_none()
        
        if session:
            # Update last_active timestamp
            session.last_active = datetime.utcnow()
            await db.commit()
            logger.debug(f"[Session] Retrieved existing session: {session_id}")
            return session
        else:
            logger.warning(f"[Session] Session {session_id} not found, creating new anonymous session")
    
    # Create new anonymous session
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
    
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)
    
    logger.info(f"[Session] Created new anonymous session: {new_session.id}")
    return new_session
