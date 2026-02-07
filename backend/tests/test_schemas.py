"""Tests for app.schemas.readme"""
import pytest
from uuid import uuid4
from datetime import datetime
from pydantic import ValidationError

from app.schemas.readme import (
    GitHubUrlRequest,
    GenerateReadmeRequest,
    GenerateReadmeResponse,
    DownloadReadmeResponse,
    ReadmeDetailResponse,
)


# ──────────────────────────────────────────────────────────────
# GitHubUrlRequest
# ──────────────────────────────────────────────────────────────

class TestGitHubUrlRequest:
    """Tests for GitHubUrlRequest schema validation."""

    def test_valid_https_url(self):
        req = GitHubUrlRequest(github_url="https://github.com/owner/repo")
        assert req.github_url == "https://github.com/owner/repo"

    def test_valid_url_with_trailing_slash(self):
        req = GitHubUrlRequest(github_url="https://github.com/owner/repo/")
        assert "github.com" in req.github_url

    def test_valid_url_with_git_suffix(self):
        req = GitHubUrlRequest(github_url="https://github.com/owner/repo.git")
        assert "github.com" in req.github_url

    def test_valid_url_with_www(self):
        req = GitHubUrlRequest(github_url="https://www.github.com/owner/repo")
        assert "github.com" in req.github_url

    def test_invalid_url_not_github(self):
        with pytest.raises(ValidationError):
            GitHubUrlRequest(github_url="https://gitlab.com/owner/repo")

    def test_invalid_url_no_repo(self):
        with pytest.raises(ValidationError):
            GitHubUrlRequest(github_url="https://github.com/owner")

    def test_invalid_url_empty(self):
        with pytest.raises(ValidationError):
            GitHubUrlRequest(github_url="")

    def test_valid_http_url(self):
        req = GitHubUrlRequest(github_url="http://github.com/owner/repo")
        assert "github.com" in req.github_url


# ──────────────────────────────────────────────────────────────
# GenerateReadmeRequest
# ──────────────────────────────────────────────────────────────

class TestGenerateReadmeRequest:
    """Tests for GenerateReadmeRequest schema."""

    def test_valid_request(self):
        req = GenerateReadmeRequest(
            github_url="https://github.com/owner/repo",
            session_id=1,
            github_api_key="ghp_test123",
        )
        assert req.github_url == "https://github.com/owner/repo"
        assert req.session_id == 1
        assert req.github_api_key == "ghp_test123"

    def test_optional_fields(self):
        req = GenerateReadmeRequest(github_url="https://github.com/owner/repo")
        assert req.session_id is None
        assert req.github_api_key is None

    def test_invalid_url(self):
        with pytest.raises(ValidationError):
            GenerateReadmeRequest(github_url="https://notgithub.com/owner/repo")

    def test_url_stripped(self):
        req = GenerateReadmeRequest(github_url="  https://github.com/owner/repo  ")
        assert req.github_url.strip() == "https://github.com/owner/repo"


# ──────────────────────────────────────────────────────────────
# GenerateReadmeResponse
# ──────────────────────────────────────────────────────────────

class TestGenerateReadmeResponse:
    """Tests for GenerateReadmeResponse schema."""

    def test_valid_response(self):
        test_id = uuid4()
        resp = GenerateReadmeResponse(id=test_id, status="pending")
        assert resp.id == test_id
        assert resp.status == "pending"

    def test_completed_status(self):
        resp = GenerateReadmeResponse(id=uuid4(), status="completed")
        assert resp.status == "completed"


# ──────────────────────────────────────────────────────────────
# DownloadReadmeResponse
# ──────────────────────────────────────────────────────────────

class TestDownloadReadmeResponse:
    """Tests for DownloadReadmeResponse schema."""

    def test_with_content(self):
        resp = DownloadReadmeResponse(status="completed", readme_content="# README")
        assert resp.status == "completed"
        assert resp.readme_content == "# README"

    def test_without_content(self):
        resp = DownloadReadmeResponse(status="processing")
        assert resp.readme_content is None


# ──────────────────────────────────────────────────────────────
# ReadmeDetailResponse
# ──────────────────────────────────────────────────────────────

class TestReadmeDetailResponse:
    """Tests for ReadmeDetailResponse schema."""

    def test_valid_detail_response(self):
        now = datetime.utcnow()
        resp = ReadmeDetailResponse(
            id=uuid4(),
            status="completed",
            readme_content="# Test",
            repo_name="test-repo",
            repo_url="https://github.com/owner/repo",
            created_at=now,
            updated_at=now,
        )
        assert resp.repo_name == "test-repo"
        assert resp.status == "completed"

    def test_optional_fields(self):
        now = datetime.utcnow()
        resp = ReadmeDetailResponse(
            id=uuid4(),
            status="pending",
            repo_name="test",
            created_at=now,
            updated_at=now,
        )
        assert resp.readme_content is None
        assert resp.repo_url is None
