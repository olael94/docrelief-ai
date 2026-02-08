"""
Pydantic schemas for GitHub API endpoints.
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class RepositoryInfo(BaseModel):
    """Schema for a single repository information"""
    id: int
    name: str
    full_name: str
    description: Optional[str] = None
    private: bool
    html_url: str
    clone_url: str
    default_branch: str
    language: Optional[str] = None
    stargazers_count: int
    forks_count: int
    updated_at: datetime
    owner: str

    class Config:
        json_schema_extra = {
            "example": {
                "id": 123456789,
                "name": "my-repo",
                "full_name": "owner/my-repo",
                "description": "My awesome repository",
                "private": False,
                "html_url": "https://github.com/owner/my-repo",
                "clone_url": "https://github.com/owner/my-repo.git",
                "default_branch": "main",
                "language": "Python",
                "stargazers_count": 10,
                "forks_count": 2,
                "updated_at": "2024-01-01T00:00:00Z",
                "owner": "owner"
            }
        }


class ListReposResponse(BaseModel):
    """Schema for listing GitHub repositories response"""
    total_count: int
    repositories: List[RepositoryInfo]

    class Config:
        json_schema_extra = {
            "example": {
                "total_count": 1,
                "repositories": [
                    {
                        "id": 123456789,
                        "name": "my-repo",
                        "full_name": "owner/my-repo",
                        "description": "My awesome repository",
                        "private": False,
                        "html_url": "https://github.com/owner/my-repo",
                        "clone_url": "https://github.com/owner/my-repo.git",
                        "default_branch": "main",
                        "language": "Python",
                        "stargazers_count": 10,
                        "forks_count": 2,
                        "updated_at": "2024-01-01T00:00:00Z",
                        "owner": "owner"
                    }
                ]
            }
        }
