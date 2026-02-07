"""Tests for app.models (enums and model definitions)"""
import pytest
from app.models.generated_readme import InputMethod, ReadmeStatus


class TestInputMethodEnum:
    """Tests for InputMethod enum values."""

    def test_public_url_value(self):
        assert InputMethod.PUBLIC_URL.value == "public_url"

    def test_file_upload_value(self):
        assert InputMethod.FILE_UPLOAD.value == "file_upload"

    def test_github_auth_value(self):
        assert InputMethod.GITHUB_AUTH.value == "github_auth"

    def test_is_str_enum(self):
        assert isinstance(InputMethod.PUBLIC_URL, str)
        assert InputMethod.PUBLIC_URL == "public_url"

    def test_all_members(self):
        members = list(InputMethod)
        assert len(members) == 3


class TestReadmeStatusEnum:
    """Tests for ReadmeStatus enum values."""

    def test_pending_value(self):
        assert ReadmeStatus.PENDING.value == "pending"

    def test_processing_value(self):
        assert ReadmeStatus.PROCESSING.value == "processing"

    def test_completed_value(self):
        assert ReadmeStatus.COMPLETED.value == "completed"

    def test_failed_value(self):
        assert ReadmeStatus.FAILED.value == "failed"

    def test_is_str_enum(self):
        assert isinstance(ReadmeStatus.PENDING, str)
        assert ReadmeStatus.PENDING == "pending"

    def test_all_members(self):
        members = list(ReadmeStatus)
        assert len(members) == 4
