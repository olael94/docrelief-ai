from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID, ENUM as PG_ENUM
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import uuid
from app.db.session import Base

class InputMethod(str, enum.Enum):
    """Enum for input methods used to generate README"""
    PUBLIC_URL = "public_url"
    FILE_UPLOAD = "file_upload"
    GITHUB_AUTH = "github_auth"

class ReadmeStatus(str, enum.Enum):
    """Enum for README generation status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class GeneratedReadme(Base):
    __tablename__ = "generated_readmes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)  # FK, not null
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)  # FK, nullable
    repo_name = Column(String, nullable=False)
    repo_url = Column(Text, nullable=True)
    input_method = Column(Enum(InputMethod), nullable=False)
    status = Column(
        PG_ENUM('pending', 'processing', 'completed', 'failed', name='readmestatus', create_type=False),
        nullable=False,
        default=ReadmeStatus.PENDING.value,
        index=True
    )
    readme_content = Column(Text, nullable=True)
    was_committed = Column(Boolean, default=False, nullable=False)
    was_downloaded = Column(Boolean, default=False, nullable=False)
    commit_url = Column(Text, nullable=True)
    commit_sha = Column(String, nullable=True, index=True) # This will store the commit SHA for cacheing purposes
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    session = relationship("Session", back_populates="generated_readmes")
    user = relationship("User", back_populates="generated_readmes")
