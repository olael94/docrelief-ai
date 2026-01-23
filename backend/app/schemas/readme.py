from pydantic import BaseModel, field_validator, HttpUrl
from typing import Optional
import re


class GitHubUrlRequest(BaseModel):
    """Schema for GitHub URL validation"""
    github_url: str

    @field_validator('github_url')
    @classmethod
    def validate_github_url(cls, v: str) -> str:
        """Validates if the URL is a valid GitHub repository"""
        # Accepted patterns:
        # - https://github.com/owner/repo
        # - https://github.com/owner/repo.git
        # - https://github.com/owner/repo/
        # - http://github.com/owner/repo (less common, but accepted)
        
        patterns = [
            r'^https?://github\.com/[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+(?:/|\.git)?/?$',
            r'^https?://www\.github\.com/[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+(?:/|\.git)?/?$',
        ]
        
        v = v.strip()
        
        for pattern in patterns:
            if re.match(pattern, v, re.IGNORECASE):
                return v
        
        raise ValueError(
            "Invalid URL. Must be in format: https://github.com/owner/repository"
        )

    class Config:
        json_schema_extra = {
            "example": {
                "github_url": "https://github.com/owner/repository"
            }
        }
