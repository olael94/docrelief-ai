"""Tests for app.services.github_service"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import httpx

from app.services.github_service import (
    validate_github_url,
    is_repository_accessible,
    is_repository_public,
    detect_repo_changes,
)


# ──────────────────────────────────────────────────────────────
# validate_github_url
# ──────────────────────────────────────────────────────────────

class TestValidateGithubUrl:
    """Tests for the validate_github_url function."""

    def test_valid_https_url(self):
        owner, repo = validate_github_url("https://github.com/owner/repo")
        assert owner == "owner"
        assert repo == "repo"

    def test_valid_url_with_trailing_slash(self):
        owner, repo = validate_github_url("https://github.com/owner/repo/")
        assert owner == "owner"
        assert repo == "repo"

    def test_valid_url_with_dot_git(self):
        owner, repo = validate_github_url("https://github.com/owner/repo.git")
        assert owner == "owner"
        assert repo == "repo"

    def test_valid_url_with_www(self):
        owner, repo = validate_github_url("https://www.github.com/owner/repo")
        assert owner == "owner"
        assert repo == "repo"

    def test_valid_http_url(self):
        owner, repo = validate_github_url("http://github.com/owner/repo")
        assert owner == "owner"
        assert repo == "repo"

    def test_valid_url_with_hyphens_and_dots(self):
        owner, repo = validate_github_url("https://github.com/my-org/my-repo.js")
        assert owner == "my-org"
        assert repo == "my-repo.js"

    def test_valid_url_with_underscores(self):
        owner, repo = validate_github_url("https://github.com/my_org/my_repo")
        assert owner == "my_org"
        assert repo == "my_repo"

    def test_valid_url_with_whitespace(self):
        owner, repo = validate_github_url("  https://github.com/owner/repo  ")
        assert owner == "owner"
        assert repo == "repo"

    def test_invalid_url_not_github(self):
        with pytest.raises(ValueError, match="Invalid GitHub URL"):
            validate_github_url("https://gitlab.com/owner/repo")

    def test_invalid_url_no_repo(self):
        with pytest.raises(ValueError):
            validate_github_url("https://github.com/owner")

    def test_invalid_url_empty_string(self):
        with pytest.raises(ValueError):
            validate_github_url("")

    def test_invalid_url_random_text(self):
        with pytest.raises(ValueError):
            validate_github_url("not a url at all")

    def test_url_with_extra_path_segments(self):
        owner, repo = validate_github_url("https://github.com/owner/repo/tree/main")
        assert owner == "owner"
        # repo may contain extra segments joined by /
        assert "repo" in repo

    def test_url_with_git_colon_syntax(self):
        owner, repo = validate_github_url("git@github.com:owner/repo")
        assert owner == "owner"
        assert repo == "repo"


# ──────────────────────────────────────────────────────────────
# is_repository_accessible
# ──────────────────────────────────────────────────────────────

class TestIsRepositoryAccessible:
    """Tests for is_repository_accessible function."""

    @pytest.mark.asyncio
    async def test_public_repo_accessible(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"private": False, "name": "test-repo"}

        with patch("app.services.github_service.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            is_accessible, repo_data, is_public = await is_repository_accessible(
                "https://github.com/owner/repo"
            )

            assert is_accessible is True
            assert is_public is True
            assert repo_data["name"] == "test-repo"

    @pytest.mark.asyncio
    async def test_private_repo_accessible_with_key(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"private": True, "name": "private-repo"}

        with patch("app.services.github_service.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            is_accessible, repo_data, is_public = await is_repository_accessible(
                "https://github.com/owner/private-repo", github_api_key="ghp_test123"
            )

            assert is_accessible is True
            assert is_public is False
            assert repo_data["name"] == "private-repo"

    @pytest.mark.asyncio
    async def test_repo_not_found_404(self):
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.text = "Not Found"

        with patch("app.services.github_service.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            with pytest.raises(ValueError, match="Repository not found"):
                await is_repository_accessible("https://github.com/owner/nonexistent")

    @pytest.mark.asyncio
    async def test_repo_forbidden_403_no_key(self):
        mock_response = MagicMock()
        mock_response.status_code = 403
        mock_response.text = "rate limit exceeded"

        with patch("app.services.github_service.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            with pytest.raises(Exception, match="Access denied"):
                await is_repository_accessible("https://github.com/owner/repo")

    @pytest.mark.asyncio
    async def test_repo_forbidden_403_with_key(self):
        mock_response = MagicMock()
        mock_response.status_code = 403
        mock_response.text = "forbidden"

        with patch("app.services.github_service.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            with pytest.raises(Exception, match="Access denied"):
                await is_repository_accessible(
                    "https://github.com/owner/repo", github_api_key="ghp_bad"
                )

    @pytest.mark.asyncio
    async def test_repo_unauthorized_401(self):
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.text = "Bad credentials"

        with patch("app.services.github_service.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            with pytest.raises(Exception, match="Invalid GitHub API key"):
                await is_repository_accessible(
                    "https://github.com/owner/repo", github_api_key="ghp_bad"
                )

    @pytest.mark.asyncio
    async def test_repo_unexpected_status(self):
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"

        with patch("app.services.github_service.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            with pytest.raises(Exception, match="Error accessing repository"):
                await is_repository_accessible("https://github.com/owner/repo")

    @pytest.mark.asyncio
    async def test_http_connection_error(self):
        with patch("app.services.github_service.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=httpx.HTTPError("Connection refused"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            with pytest.raises(Exception, match="Connection error"):
                await is_repository_accessible("https://github.com/owner/repo")

    @pytest.mark.asyncio
    async def test_404_with_api_key_mentions_permissions(self):
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.text = "Not Found"

        with patch("app.services.github_service.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            with pytest.raises(ValueError, match="permissions"):
                await is_repository_accessible(
                    "https://github.com/owner/repo", github_api_key="ghp_test"
                )


# ──────────────────────────────────────────────────────────────
# is_repository_public
# ──────────────────────────────────────────────────────────────

class TestIsRepositoryPublic:
    """Tests for is_repository_public backward compatibility wrapper."""

    @pytest.mark.asyncio
    async def test_public_repo(self):
        with patch(
            "app.services.github_service.is_repository_accessible",
            new_callable=AsyncMock,
            return_value=(True, {"name": "repo"}, True),
        ):
            is_public, repo_data = await is_repository_public("https://github.com/owner/repo")
            assert is_public is True
            assert repo_data is not None

    @pytest.mark.asyncio
    async def test_private_repo(self):
        with patch(
            "app.services.github_service.is_repository_accessible",
            new_callable=AsyncMock,
            return_value=(True, {"name": "repo"}, False),
        ):
            is_public, repo_data = await is_repository_public("https://github.com/owner/repo")
            assert is_public is False
            assert repo_data is None


# ──────────────────────────────────────────────────────────────
# detect_repo_changes
# ──────────────────────────────────────────────────────────────

class TestDetectRepoChanges:
    """Tests for detect_repo_changes function."""

    @pytest.mark.asyncio
    async def test_successful_comparison(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "files": [{"filename": "README.md"}, {"filename": "src/main.py"}],
            "commits": [
                {"commit": {"message": "Update README\nWith details"}},
                {"commit": {"message": "Fix bug"}},
            ],
            "total_commits": 2,
            "deletions": 5,
        }

        with patch("app.services.github_service.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            changes = await detect_repo_changes(
                "https://github.com/owner/repo", "abc1234", "def5678"
            )

            assert changes is not None
            assert changes["files_changed_count"] == 2
            assert changes["commits_count"] == 2
            assert "README.md" in changes["files_changed_names"]
            assert "Update README" in changes["commit_messages"]

    @pytest.mark.asyncio
    async def test_comparison_failed(self):
        mock_response = MagicMock()
        mock_response.status_code = 404

        with patch("app.services.github_service.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            changes = await detect_repo_changes(
                "https://github.com/owner/repo", "abc1234", "def5678"
            )

            assert changes is None

    @pytest.mark.asyncio
    async def test_comparison_with_api_key(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "files": [],
            "commits": [],
            "total_commits": 0,
            "deletions": 0,
        }

        with patch("app.services.github_service.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            changes = await detect_repo_changes(
                "https://github.com/owner/repo",
                "abc1234",
                "def5678",
                github_api_key="ghp_test",
            )

            assert changes is not None
            assert changes["files_changed_count"] == 0

    @pytest.mark.asyncio
    async def test_comparison_exception(self):
        with patch("app.services.github_service.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=Exception("Network error"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            changes = await detect_repo_changes(
                "https://github.com/owner/repo", "abc1234", "def5678"
            )

            assert changes is None
