"""
Pydantic schemas for GitHub OAuth authentication.
"""
from pydantic import BaseModel


class GitHubAuthorizationResponse(BaseModel):
    """Response containing the GitHub authorization URL."""
    authorization_url: str


class GitHubCallbackError(BaseModel):
    """Error response for OAuth callback failures."""
    error: str
    error_description: str | None = None
