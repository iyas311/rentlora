import os
from functools import lru_cache

import boto3
from pydantic_settings import BaseSettings, SettingsConfigDict

# Fallback defaults — used for local/dev and whenever Parameter Store lookups fail.
DEFAULT_EMBEDDING_MODEL_ID = "amazon.titan-embed-text-v2:0"
DEFAULT_NOVA_MODEL_ID = "amazon.nova-lite-v1:0"


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/rentlora"
    AWS_DEFAULT_REGION: str = "us-east-1"
    # Empty -> no event-driven consumer; the service falls back to DB polling backfill.
    PROPERTY_SYNC_QUEUE_URL: str = ""
    EMBEDDING_MODEL_ID: str = DEFAULT_EMBEDDING_MODEL_ID
    NOVA_MODEL_ID: str = DEFAULT_NOVA_MODEL_ID

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


def fetch_aws_config():
    """Pull runtime config from Secrets Manager + Parameter Store in dev/prod.

    Every lookup has a fallback so a missing parameter never crashes the service.
    Credentials come from the pod's IRSA role — no static keys.
    """
    env = os.getenv("ENV", "local")
    if env not in ["dev", "prod"]:
        return {}

    region = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
    ssm = boto3.client("ssm", region_name=region)
    secrets = boto3.client("secretsmanager", region_name=region)

    overrides = {"AWS_DEFAULT_REGION": region}

    def _param(name, default):
        try:
            return ssm.get_parameter(Name=name)["Parameter"]["Value"]
        except Exception:
            return default

    # Database connection built from Secrets Manager + Parameter Store (no static creds).
    try:
        db_pass = secrets.get_secret_value(SecretId=f"/rentlora/{env}/db-password")["SecretString"]
        db_endpoint = ssm.get_parameter(Name=f"/rentlora/{env}/db-endpoint")["Parameter"]["Value"]
        db_user = _param(f"/rentlora/{env}/db-user", "postgres")
        db_name = _param(f"/rentlora/{env}/db-name", "rentlora")
        overrides["DATABASE_URL"] = f"postgresql+asyncpg://{db_user}:{db_pass}@{db_endpoint}/{db_name}"
    except Exception:
        pass  # fall back to env/default DATABASE_URL

    overrides["PROPERTY_SYNC_QUEUE_URL"] = _param(f"/rentlora/{env}/property-sync-queue-url", "")
    overrides["EMBEDDING_MODEL_ID"] = _param(f"/rentlora/{env}/bedrock-embedding-model-id", DEFAULT_EMBEDDING_MODEL_ID)
    overrides["NOVA_MODEL_ID"] = _param(f"/rentlora/{env}/bedrock-nova-model-id", DEFAULT_NOVA_MODEL_ID)
    return overrides


@lru_cache
def get_settings() -> Settings:
    return Settings(**fetch_aws_config())


settings = get_settings()
