import asyncio
import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from config import get_settings
from database import Base, engine
import models  # noqa: F401
from routes import auth_router, bookings_router, users_router

settings = get_settings()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("booking-service")

app = FastAPI(title="Rentlora Booking Service", version=settings.app_version)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info("%s %s %s %.2fms", request.method, request.url.path, response.status_code, duration_ms)
    return response


@app.on_event("startup")
async def startup():
    for attempt in range(5):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
                await conn.execute(text("SELECT 1"))
            break
        except Exception as e:
            if attempt == 4:
                logger.error("Failed to initialize database after 5 attempts")
                raise e
            logger.warning(f"Database initialization attempt {attempt + 1} failed. Retrying in 2 seconds...")
            await asyncio.sleep(2)
    logger.info("booking-service started on port 8002")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "booking-service", "db": "connected"}


app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(bookings_router, prefix="/api")
