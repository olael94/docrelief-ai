from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.db.session import Base

class InputMethod(str, enum.Enum):
    """Enum for input methods used to generate README"""
    PUBLIC_URL = "public_url"
    FILE_UPLOAD = "file_upload"
    GITHUB_AUTH = "github_auth"

class GeneratedReadme(Base):
    __tablename__ = "generated_readmes"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)  # FK, not null
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)  # FK, nullable
    repo_name = Column(String, nullable=False)
    repo_url = Column(Text, nullable=True)
    input_method = Column(Enum(InputMethod), nullable=False)
    readme_content = Column(Text, nullable=False)
    was_committed = Column(Boolean, default=False, nullable=False)
    was_downloaded = Column(Boolean, default=False, nullable=False)
    commit_url = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    session = relationship("Session", back_populates="generated_readmes")
    user = relationship("User", back_populates="generated_readmes")
