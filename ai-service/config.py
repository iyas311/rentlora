from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "ai-service"
    app_version: str = "1.0.0"
    jwt_secret: str
    xai_api_key: str | None = None
    xai_model: str = "grok-4.3"
    xai_timeout_seconds: float = 30.0

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
