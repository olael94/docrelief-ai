"""Tests for app.services.readme_generator"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from uuid import uuid4

from app.services.readme_generator import (
    create_readme_prompt,
    generate_readme_with_langchain,
    process_readme_generation_async,
    process_zip_readme_generation_async,
)
from app.models.generated_readme import ReadmeStatus


# ──────────────────────────────────────────────────────────────
# create_readme_prompt
# ──────────────────────────────────────────────────────────────

class TestCreateReadmePrompt:
    """Tests for create_readme_prompt function."""

    def test_basic_prompt(self, sample_repo_data):
        prompt = create_readme_prompt(sample_repo_data)

        assert "test-project" in prompt
        assert "Python" in prompt
        assert "A test project for unit testing" in prompt
        assert "README Instructions" in prompt

    def test_prompt_includes_structure(self, sample_repo_data):
        prompt = create_readme_prompt(sample_repo_data)

        assert "src/" in prompt
        assert "Project Structure" in prompt

    def test_prompt_includes_config_files(self, sample_repo_data):
        prompt = create_readme_prompt(sample_repo_data)

        assert "requirements.txt" in prompt
        assert "fastapi==0.104.1" in prompt

    def test_prompt_includes_main_files(self, sample_repo_data):
        prompt = create_readme_prompt(sample_repo_data)

        assert "src/main.py" in prompt
        # Content should be included as a code snippet, not just the path
        assert "from fastapi import FastAPI" in prompt
        assert "```" in prompt

    def test_prompt_main_files_sends_content_not_just_paths(self, sample_repo_data):
        prompt = create_readme_prompt(sample_repo_data)

        for file_path, content in list(sample_repo_data["main_files"].items())[:3]:
            assert file_path in prompt
            assert content[:50] in prompt  # actual content is present, not just the path

    def test_prompt_limits_main_files_to_3(self):
        data = {
            "name": "project",
            "description": "",
            "language": "Python",
            "structure": [],
            "config_files": {},
            "main_files": {f"file_{i}.py": f"content_{i}" for i in range(10)},
        }

        prompt = create_readme_prompt(data)
        assert "file_0.py" in prompt
        assert "file_2.py" in prompt
        assert "file_3.py" not in prompt  # only first 3 are included

    def test_prompt_main_files_truncates_content_at_200_chars(self):
        long_content = "x" * 500
        data = {
            "name": "project",
            "description": "",
            "language": "Python",
            "structure": [],
            "config_files": {},
            "main_files": {"main.py": long_content},
        }

        prompt = create_readme_prompt(data)
        assert "x" * 200 in prompt
        assert "x" * 201 not in prompt

    def test_prompt_with_changes(self, sample_repo_data):
        changes = {
            "commits_count": 3,
            "files_changed_count": 5,
            "files_changed_names": ["README.md", "src/main.py"],
            "commit_messages": ["Update readme", "Fix bug", "Add feature"],
        }

        prompt = create_readme_prompt(sample_repo_data, changes=changes)

        assert "Recent Repository Changes" in prompt
        assert "3 new commit(s)" in prompt
        assert "5 file(s) were modified" in prompt
        assert "Update readme" in prompt
        assert "Fix bug" in prompt

    def test_prompt_without_changes(self, sample_repo_data):
        prompt = create_readme_prompt(sample_repo_data, changes=None)

        assert "Recent Repository Changes" not in prompt

    def test_prompt_with_empty_repo_data(self):
        empty_data = {
            "name": "",
            "description": "",
            "language": "Unknown",
            "structure": [],
            "config_files": {},
            "main_files": {},
        }

        prompt = create_readme_prompt(empty_data)
        assert "README Instructions" in prompt
        assert "Not provided" in prompt

    def test_prompt_limits_structure(self):
        data = {
            "name": "large-project",
            "description": "",
            "language": "Python",
            "structure": [f"dir_{i}/" for i in range(30)],
            "config_files": {},
            "main_files": {},
        }

        prompt = create_readme_prompt(data)
        # Full structure is sent — no artificial limit
        assert "dir_0/" in prompt
        assert "dir_29/" in prompt
        assert "Project Structure" in prompt

    def test_prompt_limits_config_files(self):
        data = {
            "name": "project",
            "description": "",
            "language": "Python",
            "structure": [],
            "config_files": {f"config_{i}.yaml": "content" for i in range(10)},
            "main_files": {},
        }

        prompt = create_readme_prompt(data)
        # Should limit to first 5
        assert "config_0.yaml" in prompt
        assert "config_4.yaml" in prompt


# ──────────────────────────────────────────────────────────────
# generate_readme_with_langchain
# ──────────────────────────────────────────────────────────────

class TestGenerateReadmeWithLangchain:
    """Tests for generate_readme_with_langchain function."""

    @pytest.mark.asyncio
    async def test_successful_generation(self, sample_repo_data):
        mock_response = MagicMock()
        mock_response.content = "# Test Project\n\nA great project description."
        mock_response.response_metadata = {
            "token_usage": {"prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150}
        }

        with patch("app.services.readme_generator.ChatOpenAI") as mock_llm_cls:
            mock_llm = MagicMock()
            mock_llm.ainvoke = AsyncMock(return_value=mock_response)
            mock_llm_cls.return_value = mock_llm

            result = await generate_readme_with_langchain(sample_repo_data)

            assert result.startswith("# Test Project")
            assert "A great project description." in result
            mock_llm.ainvoke.assert_called_once()

    @pytest.mark.asyncio
    async def test_strips_markdown_fences(self, sample_repo_data):
        mock_response = MagicMock()
        mock_response.content = "```markdown\n# Test Project\n\nDescription\n```"
        mock_response.response_metadata = {}

        with patch("app.services.readme_generator.ChatOpenAI") as mock_llm_cls:
            mock_llm = MagicMock()
            mock_llm.ainvoke = AsyncMock(return_value=mock_response)
            mock_llm_cls.return_value = mock_llm

            result = await generate_readme_with_langchain(sample_repo_data)

            assert not result.startswith("```")
            assert not result.endswith("```")
            assert "# Test Project" in result

    @pytest.mark.asyncio
    async def test_strips_plain_code_fences(self, sample_repo_data):
        mock_response = MagicMock()
        mock_response.content = "```\n# Test Project\n\nDescription\n```"
        mock_response.response_metadata = {}

        with patch("app.services.readme_generator.ChatOpenAI") as mock_llm_cls:
            mock_llm = MagicMock()
            mock_llm.ainvoke = AsyncMock(return_value=mock_response)
            mock_llm_cls.return_value = mock_llm

            result = await generate_readme_with_langchain(sample_repo_data)

            assert not result.startswith("```")
            assert not result.endswith("```")

    @pytest.mark.asyncio
    async def test_adds_title_if_missing(self, sample_repo_data):
        mock_response = MagicMock()
        mock_response.content = "A project without a title heading."
        mock_response.response_metadata = {}

        with patch("app.services.readme_generator.ChatOpenAI") as mock_llm_cls:
            mock_llm = MagicMock()
            mock_llm.ainvoke = AsyncMock(return_value=mock_response)
            mock_llm_cls.return_value = mock_llm

            result = await generate_readme_with_langchain(sample_repo_data)

            assert result.startswith("# test-project")

    @pytest.mark.asyncio
    async def test_openai_error(self, sample_repo_data):
        with patch("app.services.readme_generator.ChatOpenAI") as mock_llm_cls:
            mock_llm = MagicMock()
            mock_llm.ainvoke = AsyncMock(side_effect=Exception("API rate limit"))
            mock_llm_cls.return_value = mock_llm

            with pytest.raises(Exception, match="Error generating README"):
                await generate_readme_with_langchain(sample_repo_data)

    @pytest.mark.asyncio
    async def test_generation_with_changes(self, sample_repo_data):
        changes = {
            "commits_count": 2,
            "files_changed_count": 3,
            "files_changed_names": ["setup.py"],
            "commit_messages": ["Add tests"],
        }

        mock_response = MagicMock()
        mock_response.content = "# Test Project\n\nUpdated project."
        mock_response.response_metadata = {}

        with patch("app.services.readme_generator.ChatOpenAI") as mock_llm_cls:
            mock_llm = MagicMock()
            mock_llm.ainvoke = AsyncMock(return_value=mock_response)
            mock_llm_cls.return_value = mock_llm

            result = await generate_readme_with_langchain(sample_repo_data, changes=changes)

            assert "# Test Project" in result


# ──────────────────────────────────────────────────────────────
# process_readme_generation_async (background task)
# ──────────────────────────────────────────────────────────────

class TestProcessReadmeGenerationAsync:
    """Tests for the background README generation task."""

    @pytest.mark.asyncio
    async def test_successful_generation_first_time(self):
        """First-time generation: no previous readme, completes successfully."""
        readme_uuid = uuid4()

        # Mock the readme record
        mock_record = MagicMock()
        mock_record.id = readme_uuid
        mock_record.repo_name = "test-repo"
        mock_record.repo_url = "https://github.com/owner/test-repo"
        mock_record.status = ReadmeStatus.PENDING.value

        # Mock DB session
        mock_db = AsyncMock()
        # First execute: fetch the record
        mock_result1 = MagicMock()
        mock_result1.scalar_one_or_none.return_value = mock_record
        # Second execute: check for previous readme (none found)
        mock_result2 = MagicMock()
        mock_result2.scalar_one_or_none.return_value = None

        mock_db.execute = AsyncMock(side_effect=[mock_result1, mock_result2])
        mock_db.commit = AsyncMock()

        # Mock AsyncSessionLocal context manager
        mock_session_cm = AsyncMock()
        mock_session_cm.__aenter__ = AsyncMock(return_value=mock_db)
        mock_session_cm.__aexit__ = AsyncMock(return_value=False)

        with patch(
            "app.services.readme_generator.AsyncSessionLocal", return_value=mock_session_cm
        ), patch(
            "app.services.readme_generator.fetch_repository_content",
            new_callable=AsyncMock,
            return_value={
                "name": "test-repo",
                "language": "Python",
                "latest_commit_sha": "abc123",
                "structure": [],
                "config_files": {},
                "main_files": {},
            },
        ), patch(
            "app.services.readme_generator.generate_readme_with_langchain",
            new_callable=AsyncMock,
            return_value="# Test Repo\n\nGenerated README content.",
        ):
            await process_readme_generation_async(readme_uuid, "https://github.com/owner/test-repo")

        # Verify status was updated to COMPLETED
        assert mock_record.status == ReadmeStatus.COMPLETED.value
        assert mock_record.readme_content == "# Test Repo\n\nGenerated README content."
        assert mock_record.commit_sha == "abc123"

    @pytest.mark.asyncio
    async def test_generation_failure_sets_failed_status(self):
        """When content fetch fails, status is set to FAILED."""
        readme_uuid = uuid4()

        mock_record = MagicMock()
        mock_record.id = readme_uuid
        mock_record.status = ReadmeStatus.PENDING.value

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_record
        mock_db.execute = AsyncMock(return_value=mock_result)
        mock_db.commit = AsyncMock()

        mock_session_cm = AsyncMock()
        mock_session_cm.__aenter__ = AsyncMock(return_value=mock_db)
        mock_session_cm.__aexit__ = AsyncMock(return_value=False)

        with patch(
            "app.services.readme_generator.AsyncSessionLocal", return_value=mock_session_cm
        ), patch(
            "app.services.readme_generator.fetch_repository_content",
            new_callable=AsyncMock,
            side_effect=Exception("Rate limit exceeded"),
        ):
            await process_readme_generation_async(readme_uuid, "https://github.com/owner/repo")

        assert mock_record.status == ReadmeStatus.FAILED.value
        assert "Rate limit exceeded" in mock_record.readme_content

    @pytest.mark.asyncio
    async def test_record_not_found_returns_early(self):
        """When the readme record doesn't exist, returns without error."""
        readme_uuid = uuid4()

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)

        mock_session_cm = AsyncMock()
        mock_session_cm.__aenter__ = AsyncMock(return_value=mock_db)
        mock_session_cm.__aexit__ = AsyncMock(return_value=False)

        with patch(
            "app.services.readme_generator.AsyncSessionLocal", return_value=mock_session_cm
        ):
            # Should not raise
            await process_readme_generation_async(readme_uuid, "https://github.com/owner/repo")

    @pytest.mark.asyncio
    async def test_generation_with_previous_same_commit(self):
        """When previous generation exists with same commit, generates fresh."""
        readme_uuid = uuid4()

        mock_record = MagicMock()
        mock_record.id = readme_uuid
        mock_record.repo_name = "test-repo"
        mock_record.repo_url = "https://github.com/owner/test-repo"
        mock_record.status = ReadmeStatus.PENDING.value

        # Previous readme with same commit SHA
        mock_prev = MagicMock()
        mock_prev.commit_sha = "abc123"

        mock_db = AsyncMock()
        mock_result1 = MagicMock()
        mock_result1.scalar_one_or_none.return_value = mock_record
        mock_result2 = MagicMock()
        mock_result2.scalar_one_or_none.return_value = mock_prev

        mock_db.execute = AsyncMock(side_effect=[mock_result1, mock_result2])
        mock_db.commit = AsyncMock()

        mock_session_cm = AsyncMock()
        mock_session_cm.__aenter__ = AsyncMock(return_value=mock_db)
        mock_session_cm.__aexit__ = AsyncMock(return_value=False)

        with patch(
            "app.services.readme_generator.AsyncSessionLocal", return_value=mock_session_cm
        ), patch(
            "app.services.readme_generator.fetch_repository_content",
            new_callable=AsyncMock,
            return_value={
                "name": "test-repo",
                "language": "Python",
                "latest_commit_sha": "abc123",
                "structure": [],
                "config_files": {},
                "main_files": {},
            },
        ), patch(
            "app.services.readme_generator.generate_readme_with_langchain",
            new_callable=AsyncMock,
            return_value="# Fresh README",
        ):
            await process_readme_generation_async(readme_uuid, "https://github.com/owner/test-repo")

        assert mock_record.status == ReadmeStatus.COMPLETED.value

    @pytest.mark.asyncio
    async def test_generation_with_previous_different_commit(self):
        """When previous generation exists with different commit, detects changes."""
        readme_uuid = uuid4()

        mock_record = MagicMock()
        mock_record.id = readme_uuid
        mock_record.repo_name = "test-repo"
        mock_record.repo_url = "https://github.com/owner/test-repo"
        mock_record.status = ReadmeStatus.PENDING.value

        mock_prev = MagicMock()
        mock_prev.commit_sha = "old_sha"

        mock_db = AsyncMock()
        mock_result1 = MagicMock()
        mock_result1.scalar_one_or_none.return_value = mock_record
        mock_result2 = MagicMock()
        mock_result2.scalar_one_or_none.return_value = mock_prev

        mock_db.execute = AsyncMock(side_effect=[mock_result1, mock_result2])
        mock_db.commit = AsyncMock()

        mock_session_cm = AsyncMock()
        mock_session_cm.__aenter__ = AsyncMock(return_value=mock_db)
        mock_session_cm.__aexit__ = AsyncMock(return_value=False)

        mock_changes = {
            "commits_count": 1,
            "files_changed_count": 2,
            "files_changed_names": ["main.py"],
            "commit_messages": ["update"],
        }

        with patch(
            "app.services.readme_generator.AsyncSessionLocal", return_value=mock_session_cm
        ), patch(
            "app.services.readme_generator.fetch_repository_content",
            new_callable=AsyncMock,
            return_value={
                "name": "test-repo",
                "language": "Python",
                "latest_commit_sha": "new_sha",
                "structure": [],
                "config_files": {},
                "main_files": {},
            },
        ), patch(
            "app.services.readme_generator.detect_repo_changes",
            new_callable=AsyncMock,
            return_value=mock_changes,
        ), patch(
            "app.services.readme_generator.generate_readme_with_langchain",
            new_callable=AsyncMock,
            return_value="# Updated README",
        ) as mock_gen:
            await process_readme_generation_async(readme_uuid, "https://github.com/owner/test-repo")

        assert mock_record.status == ReadmeStatus.COMPLETED.value
        # Verify changes were passed to generate function
        mock_gen.assert_called_once()
        call_args = mock_gen.call_args
        assert call_args[0][1] == mock_changes  # second positional arg is changes


# ──────────────────────────────────────────────────────────────
# process_zip_readme_generation_async (background task)
# ──────────────────────────────────────────────────────────────

class TestProcessZipReadmeGenerationAsync:
    """Tests for the background ZIP README generation task."""

    @pytest.mark.asyncio
    async def test_successful_zip_generation(self, tmp_path):
        readme_uuid = uuid4()

        mock_record = MagicMock()
        mock_record.id = readme_uuid
        mock_record.repo_name = "test-zip"
        mock_record.status = ReadmeStatus.PENDING.value

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_record
        mock_db.execute = AsyncMock(return_value=mock_result)
        mock_db.commit = AsyncMock()

        mock_session_cm = AsyncMock()
        mock_session_cm.__aenter__ = AsyncMock(return_value=mock_db)
        mock_session_cm.__aexit__ = AsyncMock(return_value=False)

        # Create a real zip file for the test
        import zipfile, os
        zip_path = os.path.join(str(tmp_path), "test.zip")
        with zipfile.ZipFile(zip_path, 'w') as zf:
            zf.writestr("main.py", "print('hello')")

        with patch(
            "app.services.readme_generator.AsyncSessionLocal", return_value=mock_session_cm
        ), patch(
            "app.services.readme_generator.extract_zip_file",
            return_value=str(tmp_path),
        ), patch(
            "app.services.readme_generator.analyze_project_from_directory",
            return_value={
                "name": "test-zip",
                "language": "Python",
                "structure": [],
                "config_files": {},
                "main_files": {},
            },
        ), patch(
            "app.services.readme_generator.generate_readme_with_langchain",
            new_callable=AsyncMock,
            return_value="# ZIP Project\n\nGenerated from ZIP.",
        ), patch("shutil.rmtree"), patch("os.remove"), patch("os.path.exists", return_value=False):
            await process_zip_readme_generation_async(readme_uuid, zip_path)

        assert mock_record.status == ReadmeStatus.COMPLETED.value
        assert "ZIP Project" in mock_record.readme_content

    @pytest.mark.asyncio
    async def test_zip_generation_failure(self, tmp_path):
        readme_uuid = uuid4()

        mock_record = MagicMock()
        mock_record.id = readme_uuid
        mock_record.repo_name = "test-zip"
        mock_record.status = ReadmeStatus.PENDING.value

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_record
        mock_db.execute = AsyncMock(return_value=mock_result)
        mock_db.commit = AsyncMock()

        mock_session_cm = AsyncMock()
        mock_session_cm.__aenter__ = AsyncMock(return_value=mock_db)
        mock_session_cm.__aexit__ = AsyncMock(return_value=False)

        with patch(
            "app.services.readme_generator.AsyncSessionLocal", return_value=mock_session_cm
        ), patch(
            "app.services.readme_generator.extract_zip_file",
            side_effect=Exception("Corrupted ZIP"),
        ), patch("shutil.rmtree"), patch("os.remove"), patch("os.path.exists", return_value=False):
            await process_zip_readme_generation_async(readme_uuid, "/fake/path.zip")

        assert mock_record.status == ReadmeStatus.FAILED.value
        assert "Corrupted ZIP" in mock_record.readme_content

    @pytest.mark.asyncio
    async def test_zip_record_not_found(self):
        readme_uuid = uuid4()

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)

        mock_session_cm = AsyncMock()
        mock_session_cm.__aenter__ = AsyncMock(return_value=mock_db)
        mock_session_cm.__aexit__ = AsyncMock(return_value=False)

        with patch(
            "app.services.readme_generator.AsyncSessionLocal", return_value=mock_session_cm
        ), patch("os.path.exists", return_value=False):
            # Should not raise
            await process_zip_readme_generation_async(readme_uuid, "/fake/path.zip")
