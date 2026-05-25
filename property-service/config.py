from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "property-service"
    app_version: str = "1.0.0"
    database_url: str
    jwt_secret: str
    uploads_dir: str = "./uploads"
    aws_default_region: str = "us-east-1"
    env: str = "development"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
