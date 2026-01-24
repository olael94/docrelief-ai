from pydantic import BaseModel, field_validator, HttpUrl
from typing import Optional
from uuid import UUID
import re
from app.models.generated_readme import ReadmeStatus


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


class GenerateReadmeRequest(BaseModel):
    """Schema for README generation request"""
    github_url: str
    session_id: Optional[int] = None

    @field_validator('github_url')
    @classmethod
    def validate_github_url(cls, v: str) -> str:
        """Validates if the URL is a valid GitHub repository"""
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
                "github_url": "https://github.com/owner/repository",
                "session_id": 1
            }
        }


class GenerateReadmeResponse(BaseModel):
    """Schema for README generation response"""
    id: UUID
    status: str

    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "status": "pending"
            }
        }


class DownloadReadmeResponse(BaseModel):
    """Schema for README download status response"""
    status: str
    readme_content: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "status": "completed",
                "readme_content": "# Project Name\n\n..."
            }
        }
