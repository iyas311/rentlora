import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from config import get_settings
from database import engine
from routes import properties_router, reviews_router, search_router

settings = get_settings()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("property-service")

app = FastAPI(title="Rentlora Property Service", version=settings.app_version)
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
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    logger.info("property-service started on port 8001")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "property-service", "db": "connected"}


app.include_router(properties_router)
app.include_router(search_router)
app.include_router(reviews_router)
