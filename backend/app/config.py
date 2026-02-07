from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Application settings loaded from environment variables
    DATABASE_URL: str
    OPENAI_API_KEY: str
    SECRET_KEY: str
    GITHUB_TOKEN: Optional[str] = None  # Optional GitHub token for higher rate limits
    
    # GitHub OAuth settings
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/api/auth/github/callback"
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()