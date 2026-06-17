import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import search
from sync import backfill_embeddings
import logging

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
    # Start the background task to backfill embeddings
    asyncio.create_task(backfill_embeddings())

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "search-service"}
