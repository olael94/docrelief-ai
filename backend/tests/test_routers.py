"""Tests for app.routers.readme (API endpoints)"""
import io
import zipfile
import pytest
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport
from datetime import datetime

from app.main import app
from app.db.session import get_db
from app.models.generated_readme import ReadmeStatus, InputMethod


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def create_mock_readme_record(
    readme_uuid=None,
    status="pending",
    readme_content=None,
    repo_name="test-repo",
    repo_url="https://github.com/owner/test-repo",
    was_downloaded=False,
):
    record = MagicMock()
    record.id = readme_uuid or uuid4()
    record.session_id = 1
    record.user_id = None
    record.repo_name = repo_name
    record.repo_url = repo_url
    record.input_method = InputMethod.PUBLIC_URL
    record.status = status
    record.readme_content = readme_content
    record.was_committed = False
    record.was_downloaded = was_downloaded
    record.commit_url = None
    record.commit_sha = None
    record.created_at = datetime.utcnow()
    record.updated_at = datetime.utcnow()
    return record


def create_valid_zip_bytes():
    """Creates a valid ZIP file in memory."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w') as zf:
        zf.writestr("main.py", "print('hello')")
    buf.seek(0)
    return buf.read()


# ──────────────────────────────────────────────────────────────
# POST /api/readme/generate
# ──────────────────────────────────────────────────────────────

class TestGenerateReadmeEndpoint:
    """Tests for POST /api/readme/generate."""

    @pytest.mark.asyncio
    async def test_generate_success(self):
        mock_db = AsyncMock()
        mock_session = MagicMock()
        mock_session.id = 1

        mock_record = create_mock_readme_record()

        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        with patch(
            "app.routers.readme.validate_github_url", return_value=("owner", "test-repo")
        ), patch(
            "app.routers.readme.is_repository_accessible",
            new_callable=AsyncMock,
            return_value=(True, {"name": "test-repo"}, True),
        ), patch(
            "app.routers.readme.get_or_create_anonymous_session",
            new_callable=AsyncMock,
            return_value=mock_session,
        ), patch(
            "app.routers.readme.asyncio.create_task"
        ), patch(
            "app.routers.readme.GeneratedReadme", return_value=mock_record
        ):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.post(
                    "/api/readme/generate",
                    json={"github_url": "https://github.com/owner/test-repo"},
                )

            assert response.status_code == 200
            data = response.json()
            assert "id" in data
            assert data["status"] == "pending"

    @pytest.mark.asyncio
    async def test_generate_invalid_url(self):
        mock_db = AsyncMock()

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.post(
                "/api/readme/generate",
                json={"github_url": "https://notgithub.com/owner/repo"},
            )

        assert response.status_code == 422  # Pydantic validation error

    @pytest.mark.asyncio
    async def test_generate_repo_not_accessible_access_denied(self):
        """When is_repository_accessible raises an 'Access denied' exception, returns 403."""
        mock_db = AsyncMock()

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        with patch(
            "app.routers.readme.validate_github_url", return_value=("owner", "repo")
        ), patch(
            "app.routers.readme.is_repository_accessible",
            new_callable=AsyncMock,
            side_effect=Exception("Access denied. Repository may be private."),
        ):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.post(
                    "/api/readme/generate",
                    json={"github_url": "https://github.com/owner/repo"},
                )

            assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_generate_repo_unauthorized_401(self):
        """When is_repository_accessible raises an 'Invalid' token error, returns 401."""
        mock_db = AsyncMock()

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        with patch(
            "app.routers.readme.validate_github_url", return_value=("owner", "repo")
        ), patch(
            "app.routers.readme.is_repository_accessible",
            new_callable=AsyncMock,
            side_effect=Exception("Invalid GitHub API key"),
        ):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.post(
                    "/api/readme/generate",
                    json={
                        "github_url": "https://github.com/owner/repo",
                        "github_api_key": "ghp_bad_key",
                    },
                )

            assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_generate_repo_generic_error_502(self):
        """When is_repository_accessible raises a generic error, returns 502."""
        mock_db = AsyncMock()

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        with patch(
            "app.routers.readme.validate_github_url", return_value=("owner", "repo")
        ), patch(
            "app.routers.readme.is_repository_accessible",
            new_callable=AsyncMock,
            side_effect=Exception("Connection timeout"),
        ):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.post(
                    "/api/readme/generate",
                    json={"github_url": "https://github.com/owner/repo"},
                )

            assert response.status_code == 502

    @pytest.mark.asyncio
    async def test_generate_url_validation_error(self):
        mock_db = AsyncMock()

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        with patch(
            "app.routers.readme.validate_github_url",
            side_effect=ValueError("Invalid GitHub URL"),
        ):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.post(
                    "/api/readme/generate",
                    json={"github_url": "https://github.com/owner/repo"},
                )

            assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_generate_repo_not_found(self):
        mock_db = AsyncMock()

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        with patch(
            "app.routers.readme.validate_github_url", return_value=("owner", "repo")
        ), patch(
            "app.routers.readme.is_repository_accessible",
            new_callable=AsyncMock,
            side_effect=ValueError("Repository not found"),
        ):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.post(
                    "/api/readme/generate",
                    json={"github_url": "https://github.com/owner/repo"},
                )

            assert response.status_code == 404


# ──────────────────────────────────────────────────────────────
# POST /api/readme/upload
# ──────────────────────────────────────────────────────────────

class TestUploadZipEndpoint:
    """Tests for POST /api/readme/upload."""

    @pytest.mark.asyncio
    async def test_upload_success(self):
        mock_db = AsyncMock()
        mock_session = MagicMock()
        mock_session.id = 1

        mock_record = create_mock_readme_record()

        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        zip_content = create_valid_zip_bytes()

        with patch(
            "app.routers.readme.get_or_create_anonymous_session",
            new_callable=AsyncMock,
            return_value=mock_session,
        ), patch(
            "app.routers.readme.asyncio.create_task"
        ), patch(
            "app.routers.readme.GeneratedReadme", return_value=mock_record
        ), patch("aiofiles.open", create=True) as mock_aiofiles:
            # Mock aiofiles.open context manager
            mock_file = AsyncMock()
            mock_file.write = AsyncMock()
            mock_cm = AsyncMock()
            mock_cm.__aenter__ = AsyncMock(return_value=mock_file)
            mock_cm.__aexit__ = AsyncMock(return_value=False)
            mock_aiofiles.return_value = mock_cm

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.post(
                    "/api/readme/upload",
                    files={"file": ("test.zip", zip_content, "application/zip")},
                )

            assert response.status_code == 200
            data = response.json()
            assert "id" in data
            assert data["status"] == "pending"

    @pytest.mark.asyncio
    async def test_upload_non_zip_file(self):
        mock_db = AsyncMock()

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.post(
                "/api/readme/upload",
                files={"file": ("test.txt", b"not a zip", "text/plain")},
            )

        assert response.status_code == 400
        assert "Invalid file type" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_upload_empty_file(self):
        mock_db = AsyncMock()

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        # Create a valid zip header but with empty content
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w') as zf:
            pass  # Empty zip
        buf.seek(0)
        empty_zip = buf.read()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.post(
                "/api/readme/upload",
                files={"file": ("test.zip", b"", "application/zip")},
            )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_upload_corrupted_zip(self):
        mock_db = AsyncMock()

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.post(
                "/api/readme/upload",
                files={"file": ("bad.zip", b"PK\x03\x04corrupt", "application/zip")},
            )

        assert response.status_code == 400


# ──────────────────────────────────────────────────────────────
# GET /api/readme/{readme_uuid}
# ──────────────────────────────────────────────────────────────

class TestGetReadmeEndpoint:
    """Tests for GET /api/readme/{readme_uuid}."""

    @pytest.mark.asyncio
    async def test_get_readme_found(self):
        test_uuid = uuid4()
        mock_record = create_mock_readme_record(
            readme_uuid=test_uuid,
            status="completed",
            readme_content="# Test README",
        )

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_record
        mock_db.execute = AsyncMock(return_value=mock_result)

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get(f"/api/readme/{test_uuid}")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["readme_content"] == "# Test README"
        assert data["repo_name"] == "test-repo"

    @pytest.mark.asyncio
    async def test_get_readme_not_found(self):
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        test_uuid = uuid4()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get(f"/api/readme/{test_uuid}")

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_readme_pending(self):
        test_uuid = uuid4()
        mock_record = create_mock_readme_record(
            readme_uuid=test_uuid,
            status="pending",
        )

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_record
        mock_db.execute = AsyncMock(return_value=mock_result)

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get(f"/api/readme/{test_uuid}")

        assert response.status_code == 200
        assert response.json()["status"] == "pending"


# ──────────────────────────────────────────────────────────────
# GET /api/readme/download/{readme_uuid}
# ──────────────────────────────────────────────────────────────

class TestDownloadReadmeEndpoint:
    """Tests for GET /api/readme/download/{readme_uuid}."""

    @pytest.mark.asyncio
    async def test_download_completed(self):
        test_uuid = uuid4()
        mock_record = create_mock_readme_record(
            readme_uuid=test_uuid,
            status=ReadmeStatus.COMPLETED.value,
            readme_content="# Downloaded README\n\nContent here.",
        )

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_record
        mock_db.execute = AsyncMock(return_value=mock_result)
        mock_db.commit = AsyncMock()

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get(f"/api/readme/download/{test_uuid}")

        assert response.status_code == 200
        assert "README" in response.text or "Downloaded" in response.text

    @pytest.mark.asyncio
    async def test_download_pending(self):
        test_uuid = uuid4()
        mock_record = create_mock_readme_record(
            readme_uuid=test_uuid,
            status=ReadmeStatus.PENDING.value,
        )

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_record
        mock_db.execute = AsyncMock(return_value=mock_result)

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get(f"/api/readme/download/{test_uuid}")

        assert response.status_code == 202

    @pytest.mark.asyncio
    async def test_download_processing(self):
        test_uuid = uuid4()
        mock_record = create_mock_readme_record(
            readme_uuid=test_uuid,
            status=ReadmeStatus.PROCESSING.value,
        )

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_record
        mock_db.execute = AsyncMock(return_value=mock_result)

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get(f"/api/readme/download/{test_uuid}")

        assert response.status_code == 202

    @pytest.mark.asyncio
    async def test_download_failed(self):
        test_uuid = uuid4()
        mock_record = create_mock_readme_record(
            readme_uuid=test_uuid,
            status=ReadmeStatus.FAILED.value,
            readme_content="Error: API limit reached",
        )

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_record
        mock_db.execute = AsyncMock(return_value=mock_result)

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get(f"/api/readme/download/{test_uuid}")

        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_download_not_found(self):
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        test_uuid = uuid4()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get(f"/api/readme/download/{test_uuid}")

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_download_completed_missing_content(self):
        test_uuid = uuid4()
        mock_record = create_mock_readme_record(
            readme_uuid=test_uuid,
            status=ReadmeStatus.COMPLETED.value,
            readme_content=None,
        )

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_record
        mock_db.execute = AsyncMock(return_value=mock_result)

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get(f"/api/readme/download/{test_uuid}")

        assert response.status_code == 500
        assert "content is missing" in response.json()["detail"]


# ──────────────────────────────────────────────────────────────
# PATCH /api/readme/{readme_uuid}
# ──────────────────────────────────────────────────────────────

class TestUpdateReadmeEndpoint:
    """Tests for PATCH /api/readme/{readme_uuid}."""

    @pytest.mark.asyncio
    async def test_update_success(self):
        test_uuid = uuid4()
        mock_record = create_mock_readme_record(
            readme_uuid=test_uuid,
            status="completed",
            was_downloaded=False,
        )

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_record
        mock_db.execute = AsyncMock(return_value=mock_result)
        mock_db.commit = AsyncMock()

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.patch(f"/api/readme/{test_uuid}")

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "README marked as downloaded"
        assert data["id"] == str(test_uuid)

    @pytest.mark.asyncio
    async def test_update_not_found(self):
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        test_uuid = uuid4()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.patch(f"/api/readme/{test_uuid}")

        assert response.status_code == 404
