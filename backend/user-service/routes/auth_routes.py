"""Auth routes. Sign-up / sign-in / token refresh now happen against Amazon Cognito
directly from the SPA; the backend only validates the resulting ID token. These
endpoints expose the public Cognito config and the current user."""

from auth import cognito_public_config, get_current_user
from fastapi import APIRouter, Depends
from models import User
from schemas import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/config")
async def config():
    """Public (non-secret) Cognito ids the SPA needs to sign users in."""
    return cognito_public_config()


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)


@router.post("/logout")
async def logout(_: User = Depends(get_current_user)):
    # Tokens are managed client-side via Cognito; nothing to revoke server-side.
    return {"message": "Logged out successfully"}
