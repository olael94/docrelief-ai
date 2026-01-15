from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application settings loaded from environment variables
    DATABASE_URL: str
    OPENAI_API_KEY: str
    SECRET_KEY: str

    class Config:
        env_file = ".env"

settings = Settings()