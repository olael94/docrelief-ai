from pydantic import BaseModel, field_validator, HttpUrl
from typing import Optional
from uuid import UUID
from datetime import datetime
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
    github_api_key: Optional[str] = None

    @field_validator('github_url')
    @classmethod
    def validate_github_url(cls, v: str) -> str:
        """Validates if the URL is a valid GitHub repository"""
        # Log the input to see if it's already truncated - use ERROR level to ensure it shows
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"[DEBUG Schema] Input URL: '{v}' (length: {len(v)})")
        logger.error(f"[DEBUG Schema] Input URL repr: {repr(v)}")
        logger.info(f"[Schema Validation] Input URL: '{v}' (length: {len(v)})")
        
        v = v.strip()
        
        # More permissive validation - just check basic structure
        # GitHub allows various characters in repo names, so we'll be lenient here
        # and let the service layer do the actual extraction
        if not v.startswith(('http://github.com/', 'https://github.com/', 
                           'http://www.github.com/', 'https://www.github.com/')):
            raise ValueError(
                "Invalid URL. Must be in format: https://github.com/owner/repository"
            )
        
        # Check that it has at least owner/repo structure
        if 'github.com/' in v.lower():
            parts = v.lower().split('github.com/')[1].split('/')
            if len(parts) < 2 or not parts[0] or not parts[1]:
                raise ValueError(
                    "Invalid URL. Must be in format: https://github.com/owner/repository"
                )
        
        logger.info(f"[Schema Validation] Validated URL: '{v}' (length: {len(v)})")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "github_url": "https://github.com/owner/repository",
                "session_id": 1,
                "github_api_key": "ghp_xxxxxxxxxxxxxxxxxxxx"  # Optional: for private repos
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

# Detailed response schema for a generated README JSON response
class ReadmeDetailResponse(BaseModel):
    id: UUID
    status: str
    readme_content: Optional[str] = None
    repo_name: str
    repo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True