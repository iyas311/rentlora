"""Cognito auth for the stateless ai-service (no database). Validates the Cognito
ID token against the user pool's JWKS and returns a lightweight user dict from the
claims. The chat endpoint forwards the raw token to the agent, which calls the other
services on the user's behalf."""

import os
from typing import Optional

import boto3
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

security = HTTPBearer(auto_error=False)
_REGION = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
_ENV = os.getenv("ENV", "local")


def _load_cognito():
    if _ENV not in ("dev", "prod"):
        return None
    try:
        ssm = boto3.client("ssm", region_name=_REGION)
        pool_id = ssm.get_parameter(Name=f"/rentlora/{_ENV}/cognito-user-pool-id")["Parameter"]["Value"]
        client_id = ssm.get_parameter(Name=f"/rentlora/{_ENV}/cognito-client-id")["Parameter"]["Value"]
    except Exception:
        return None
    issuer = f"https://cognito-idp.{_REGION}.amazonaws.com/{pool_id}"
    return {"client_id": client_id, "issuer": issuer, "jwks": PyJWKClient(f"{issuer}/.well-known/jwks.json")}


_COGNITO = _load_cognito()


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not creds:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    if not _COGNITO:
        raise HTTPException(status_code=500, detail="Cognito not configured")
    try:
        key = _COGNITO["jwks"].get_signing_key_from_jwt(creds.credentials).key
        claims = jwt.decode(
            creds.credentials,
            key,
            algorithms=["RS256"],
            audience=_COGNITO["client_id"],
            issuer=_COGNITO["issuer"],
        )
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token expired") from exc
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc
    if claims.get("token_use") != "id":
        raise HTTPException(status_code=401, detail="ID token required")
    groups = claims.get("cognito:groups") or []
    return {
        "id": claims.get("sub"),
        "email": (claims.get("email") or "").lower(),
        "role": groups[0] if groups else "user",
    }
