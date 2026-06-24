"""Auth routes. Sign-up / sign-in / token refresh now happen against Amazon Cognito
directly from the SPA; the backend only validates the resulting ID token. These
endpoints expose the public Cognito config and the current user."""

from auth import cognito_public_config, get_current_user
from database import get_db
from fastapi import APIRouter, Depends
from models import User
from pydantic import BaseModel
from schemas import UserOut
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/auth", tags=["auth"])


class ProfileIn(BaseModel):
    name: str | None = None
    role: str = "guest"


@router.get("/config")
async def config():
    """Public (non-secret) Cognito ids the SPA needs to sign users in."""
    return cognito_public_config()


@router.post("/register-profile", response_model=UserOut)
async def register_profile(
    payload: ProfileIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Called by the SPA right after Cognito sign-up to persist the role the user
    chose. Only self-selectable roles are honored (never admin)."""
    user.role = payload.role if payload.role in ("guest", "host") else "guest"
    if payload.name:
        user.name = payload.name
    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)


@router.post("/logout")
async def logout(_: User = Depends(get_current_user)):
    # Tokens are managed client-side via Cognito; nothing to revoke server-side.
    return {"message": "Logged out successfully"}
