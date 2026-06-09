from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import create_access_token, create_refresh_token, decode_token, get_current_user, hash_password, verify_password
from database import get_db
from models import User
from schemas import AuthResponse, LoginRequest, RefreshRequest, RefreshResponse, RegisterRequest, UserOut
from email_utils import send_welcome_email

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse)
async def register(payload: RegisterRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    existing = await db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    user = User(
        name=payload.name.strip(),
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Automatically send the AWS SES welcome email in the background!
    background_tasks.add_task(send_welcome_email, user.email, user.name)

    return AuthResponse(
        user=UserOut.model_validate(user),
        access_token=create_access_token(user.id, user.email, user.role),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return AuthResponse(
        user=UserOut.model_validate(user),
        access_token=create_access_token(user.id, user.email, user.role),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    token = decode_token(payload.refresh_token)
    if token.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = await db.scalar(select(User).where(User.id == int(token["sub"])))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return RefreshResponse(access_token=create_access_token(user.id, user.email, user.role))


@router.post("/logout")
async def logout(_: User = Depends(get_current_user)):
    return {"message": "Logged out successfully"}
