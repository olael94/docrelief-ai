"""
Shared test fixtures and configuration.
Environment variables must be set BEFORE any app modules are imported.
"""
import os

# Set environment variables before importing any app modules
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test_db")
os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")
os.environ.setdefault("SECRET_KEY", "test-secret-key")

import pytest
import uuid
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.fixture
def mock_db():
    """Creates a mock async database session."""
    db = AsyncMock()
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.execute = AsyncMock()
    return db


@pytest.fixture
def sample_repo_data():
    """Sample repository data for testing."""
    return {
        "name": "test-project",
        "description": "A test project for unit testing",
        "language": "Python",
        "latest_commit_sha": "abc1234def5678",
        "structure": ["src/", "tests/", "docs/"],
        "config_files": {
            "requirements.txt": "fastapi==0.104.1\nuvicorn==0.24.0",
            "Dockerfile": "FROM python:3.11\nWORKDIR /app",
        },
        "main_files": {
            "src/main.py": "from fastapi import FastAPI\napp = FastAPI()",
            "src/utils.py": "def helper():\n    return True",
        },
        "readme": None,
    }


@pytest.fixture
def sample_readme_uuid():
    """Sample UUID for testing."""
    return uuid.uuid4()


@pytest.fixture
def sample_session():
    """Creates a mock Session object."""
    session = MagicMock()
    session.id = 1
    session.session_token = "test-token-abc123"
    session.user_id = None
    session.created_at = datetime.utcnow()
    session.last_active = datetime.utcnow()
    session.expires_at = datetime.utcnow() + timedelta(hours=24)
    return session


@pytest.fixture
def sample_readme_record(sample_readme_uuid):
    """Creates a mock GeneratedReadme record."""
    record = MagicMock()
    record.id = sample_readme_uuid
    record.session_id = 1
    record.user_id = None
    record.repo_name = "test-repo"
    record.repo_url = "https://github.com/owner/test-repo"
    record.input_method = "public_url"
    record.status = "pending"
    record.readme_content = None
    record.was_committed = False
    record.was_downloaded = False
    record.commit_url = None
    record.commit_sha = None
    record.created_at = datetime.utcnow()
    record.updated_at = datetime.utcnow()
    return record
