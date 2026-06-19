import os
import boto3
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "ai-service"
    app_version: str = "1.0.0"
    jwt_secret: str = ""
    xai_api_key: str | None = None
    xai_model: str = "grok-4.3"
    xai_timeout_seconds: float = 30.0
    aws_default_region: str = "us-east-1"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

def fetch_aws_config():
    env = os.getenv("ENV", "local")
    if env not in ["dev", "prod"]:
        return {}
        
    secrets = boto3.client('secretsmanager', region_name='us-east-1')
    
    jwt_sec = secrets.get_secret_value(SecretId=f"/rentlora/{env}/jwt-secret")['SecretString']
    
    try:
        xai_key = secrets.get_secret_value(SecretId=f"/rentlora/{env}/xai-api-key")['SecretString']
    except Exception:
        xai_key = ""
    
    return {
        "jwt_secret": jwt_sec,
        "xai_api_key": xai_key
    }

@lru_cache
def get_settings() -> Settings:
    aws_values = fetch_aws_config()
    return Settings(**aws_values)
