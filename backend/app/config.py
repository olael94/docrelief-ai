from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Application settings loaded from environment variables
    DATABASE_URL: str
    OPENAI_API_KEY: str
    SECRET_KEY: str
    GITHUB_TOKEN: Optional[str] = None  # Optional GitHub token for higher rate limits

    class Config:
        env_file = ".env"

settings = Settings()