import asyncio
import logging

from config import settings
from consumer import consume_property_sync
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import search
from sync import backfill_embeddings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-search-service")

app = FastAPI(title="Rentlora AI Search Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/api/search", tags=["search"])


@app.on_event("startup")
async def startup_event():
    if settings.PROPERTY_SYNC_QUEUE_URL:
        logger.info("SQS queue configured — starting event-driven embedding consumer")
        asyncio.create_task(consume_property_sync())
    else:
        logger.info("No SQS queue configured — falling back to DB polling backfill")
        asyncio.create_task(backfill_embeddings())


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ai-search-service"}


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/ready")
async def ready():
    return {"status": "ready"}
