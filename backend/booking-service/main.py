import asyncio
import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from config import get_settings
from database import Base, engine
from logging_config import setup_logging
from metrics import emit_metric
import models  # noqa: F401
from routes import auth_router, bookings_router, users_router

settings = get_settings()
setup_logging("booking-service")
logger = logging.getLogger("booking-service")

app = FastAPI(title="Rentlora Booking Service", version=settings.app_version)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

METRICS_NAMESPACE = "Rentlora"
SERVICE_DIM = {"Service": "booking-service"}


@app.middleware("http")
async def observability_middleware(request: Request, call_next):
    """Log every request as structured JSON and emit CloudWatch metrics."""
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    start = time.perf_counter()

    response = await call_next(request)

    duration_ms = round((time.perf_counter() - start) * 1000, 2)
    status = response.status_code
    response.headers["X-Request-ID"] = request_id

    log_data = {
        "request_id": request_id,
        "method": request.method,
        "path": request.url.path,
        "status": status,
        "duration_ms": duration_ms,
    }

    if status >= 500:
        logger.error("request completed", extra=log_data)
        emit_metric(METRICS_NAMESPACE, "ErrorCount_5xx", 1, dimensions=SERVICE_DIM)
    elif status >= 400:
        logger.warning("request completed", extra=log_data)
        emit_metric(METRICS_NAMESPACE, "ErrorCount_4xx", 1, dimensions=SERVICE_DIM)
    else:
        logger.info("request completed", extra=log_data)

    emit_metric(METRICS_NAMESPACE, "RequestCount", 1, dimensions=SERVICE_DIM)
    emit_metric(METRICS_NAMESPACE, "RequestLatency", duration_ms, unit="Milliseconds", dimensions=SERVICE_DIM)

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
