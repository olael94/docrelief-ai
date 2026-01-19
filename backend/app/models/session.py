from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.session import Base

class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_token = Column(String, unique=True, nullable=False, index=True)  # UK, not null
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)  # FK, nullable
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    last_active = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="sessions")
    generated_readmes = relationship("GeneratedReadme", back_populates="session", cascade="all, delete-orphan")
