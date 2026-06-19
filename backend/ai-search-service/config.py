import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost:5432/rentlora")
    AWS_DEFAULT_REGION: str = os.getenv("AWS_DEFAULT_REGION", "us-east-1")

settings = Settings()
