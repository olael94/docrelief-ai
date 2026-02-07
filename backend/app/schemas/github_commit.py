from pydantic import BaseModel, Field
from uuid import UUID


class CommitReadmeRequest(BaseModel):
    """
    Note: owner, repo, and branch are NOT in request
    They are stored in GeneratedReadme and retrieved from database
    """

    user_id: int = Field(..., description="User ID")
    readme_id: UUID = Field(..., description="README ID")
    commit_message: str = Field(..., min_length=1, max_length=200)
    extended_description: str | None = Field(
        None, description="Optional extended description"
    )


class CommitReadmeResponse(BaseModel):
    success: bool
    commit_sha: str
    commit_url: str
    repo_url: str
    branch: str
    message: str
