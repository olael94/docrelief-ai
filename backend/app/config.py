from pydantic_settings import BaseSettings
from typing import Optional
from urllib.parse import quote_plus


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    All values must be provided in .env file - no hardcoded defaults.
    DATABASE_URL is automatically constructed from POSTGRES_* parameters.
    """
    # PostgreSQL connection parameters (all required in .env)
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str
    POSTGRES_PORT: str
    
    # Optional: if DATABASE_URL is provided, it will be used instead of constructing it
    DATABASE_URL: Optional[str] = None
    
    # Required settings
    OPENAI_API_KEY: str
    SECRET_KEY: str
    
    @property
    def database_url(self) -> str:
        """
        Returns DATABASE_URL. If not provided, constructs it from POSTGRES_* parameters.
        """
        if self.DATABASE_URL:
            return self.DATABASE_URL
        
        # URL encode password to handle special characters
        encoded_password = quote_plus(self.POSTGRES_PASSWORD)
        return f"postgresql+psycopg://{self.POSTGRES_USER}:{encoded_password}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    class Config:
        env_file = ".env"
        extra = "ignore"  # Ignore extra fields in .env file that aren't defined here

settings = Settings()