from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=True, index=True)  # UK, nullable
    username = Column(String, unique=True, nullable=True, index=True)  # UK, nullable
    github_username = Column(String, unique=True, nullable=False, index=True)  # UK, not null
    github_token = Column(Text, nullable=True)  # nullable, encrypted (encryption handled by application layer)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    generated_readmes = relationship("GeneratedReadme", back_populates="user", cascade="all, delete-orphan")