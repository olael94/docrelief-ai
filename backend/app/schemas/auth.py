"""
Pydantic schemas for GitHub OAuth authentication.
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any


class GitHubAuthorizationResponse(BaseModel):
    """Response containing the GitHub authorization URL."""
    authorization_url: str


class GitHubCallbackError(BaseModel):
    """Error response for OAuth callback failures."""
    error: str
    error_description: str | None = None


class UserInfo(BaseModel):
    """GitHub user information."""
    login: Optional[str] = None
    id: Optional[int] = None
    avatar_url: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None


class AuthStatusResponse(BaseModel):
    """Response for authentication status check."""
    authenticated: bool
    user: Optional[Dict[str, Any]] = None
