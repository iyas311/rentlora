import os
from functools import lru_cache

import boto3
from pydantic_settings import BaseSettings, SettingsConfigDict

# Fallback defaults — used for local/dev and whenever Parameter Store lookups fail.
DEFAULT_NOVA_MODEL_ID = "amazon.nova-lite-v1:0"
DEFAULT_EMBEDDING_MODEL_ID = "amazon.titan-embed-text-v2:0"


class Settings(BaseSettings):
    app_name: str = "ai-service"
    app_version: str = "1.0.0"
    jwt_secret: str = ""
    aws_default_region: str = "us-east-1"
    # Bedrock model IDs (Parameter Store in dev/prod, defaults otherwise)
    nova_model_id: str = DEFAULT_NOVA_MODEL_ID
    embedding_model_id: str = DEFAULT_EMBEDDING_MODEL_ID
    # Internal service URLs used by the agent tool-calling loop (Parameter Store,
    # with Kubernetes service-DNS defaults).
    ai_search_service_url: str = "http://ai-search-service:8005"
    booking_service_url: str = "http://booking-service:8002"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

def fetch_aws_config():
    env = os.getenv("ENV", "local")
    if env not in ["dev", "prod"]:
        return {}

    region = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
    secrets = boto3.client('secretsmanager', region_name=region)
    ssm = boto3.client('ssm', region_name=region)

    jwt_sec = secrets.get_secret_value(SecretId=f"/rentlora/{env}/jwt-secret")['SecretString']

    def _param(name, default):
        try:
            return ssm.get_parameter(Name=name)['Parameter']['Value']
        except Exception:
            return default

    return {
        "jwt_secret": jwt_sec,
        "aws_default_region": region,
        "nova_model_id": _param(f"/rentlora/{env}/bedrock-nova-model-id", DEFAULT_NOVA_MODEL_ID),
        "embedding_model_id": _param(f"/rentlora/{env}/bedrock-embedding-model-id", DEFAULT_EMBEDDING_MODEL_ID),
        "ai_search_service_url": _param(f"/rentlora/{env}/ai-search-service-url", "http://ai-search-service:8005"),
        "booking_service_url": _param(f"/rentlora/{env}/booking-service-url", "http://booking-service:8002"),
    }

@lru_cache
def get_settings() -> Settings:
    aws_values = fetch_aws_config()
    return Settings(**aws_values)
