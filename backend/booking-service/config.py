import os
import boto3
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "booking-service"
    app_version: str = "1.0.0"
    database_url: str = ""
    jwt_secret: str = ""
    aws_default_region: str = "us-east-1"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

def fetch_aws_config():
    if os.getenv("ENV") != "production":
        return {}
        
    ssm = boto3.client('ssm', region_name='us-east-1')
    secrets = boto3.client('secretsmanager', region_name='us-east-1')
    
    db_pass = secrets.get_secret_value(SecretId="/rentlora/prod/db-password")['SecretString']
    jwt_sec = secrets.get_secret_value(SecretId="/rentlora/prod/jwt-secret")['SecretString']
    
    db_endpoint = ssm.get_parameter(Name="/rentlora/prod/db-endpoint")['Parameter']['Value']
    
    database_url = f"postgresql+asyncpg://rentlora_admin:{db_pass}@{db_endpoint}:5432/rentlora"
    
    return {
        "database_url": database_url,
        "jwt_secret": jwt_sec
    }

@lru_cache
def get_settings() -> Settings:
    aws_values = fetch_aws_config()
    return Settings(**aws_values)
