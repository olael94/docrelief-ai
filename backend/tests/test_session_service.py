"""Tests for app.services.session_service"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta

from app.services.session_service import get_or_create_anonymous_session


class TestGetOrCreateAnonymousSession:
    """Tests for get_or_create_anonymous_session function."""

    @pytest.mark.asyncio
    async def test_create_new_session_no_session_id(self, mock_db):
        """Creates a new session when no session_id is provided."""
        mock_db.refresh = AsyncMock(side_effect=lambda obj: setattr(obj, 'id', 42))

        session = await get_or_create_anonymous_session(mock_db, session_id=None)

        assert session is not None
        assert session.user_id is None
        assert session.session_token is not None
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_existing_session(self, mock_db, sample_session):
        """Retrieves an existing session by ID."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_session
        mock_db.execute = AsyncMock(return_value=mock_result)

        session = await get_or_create_anonymous_session(mock_db, session_id=1)

        assert session.id == 1
        mock_db.commit.assert_called_once()  # Updates last_active

    @pytest.mark.asyncio
    async def test_session_not_found_creates_new(self, mock_db):
        """Creates a new session when given ID is not found."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)
        mock_db.refresh = AsyncMock(side_effect=lambda obj: setattr(obj, 'id', 99))

        session = await get_or_create_anonymous_session(mock_db, session_id=999)

        assert session is not None
        assert session.user_id is None
        mock_db.add.assert_called_once()

    @pytest.mark.asyncio
    async def test_updates_last_active(self, mock_db, sample_session):
        """Existing session has last_active updated."""
        old_last_active = sample_session.last_active
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_session
        mock_db.execute = AsyncMock(return_value=mock_result)

        session = await get_or_create_anonymous_session(mock_db, session_id=1)

        assert session.last_active >= old_last_active

    @pytest.mark.asyncio
    async def test_new_session_has_expiry(self, mock_db):
        """New session has expires_at set to 24 hours from now."""
        mock_db.refresh = AsyncMock(side_effect=lambda obj: setattr(obj, 'id', 1))

        session = await get_or_create_anonymous_session(mock_db)

        assert session.expires_at > session.created_at

    @pytest.mark.asyncio
    async def test_db_error_propagated(self, mock_db):
        """Database errors are propagated."""
        mock_db.execute = AsyncMock(side_effect=Exception("Connection refused"))

        with pytest.raises(Exception, match="Connection refused"):
            await get_or_create_anonymous_session(mock_db, session_id=1)
