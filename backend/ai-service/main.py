import logging
import time
from typing import Optional

from ai_bedrock import generate_embedding, generate_property_description, generate_rag_response, run_agent_chat
from auth import get_current_user
from config import get_settings
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from schemas import (
    ChatRequest,
    ChatResponse,
    EmbedRequest,
    EmbedResponse,
    PropertyDescriptionRequest,
    PropertyDescriptionResponse,
    RagRequest,
    RagResponse,
)

security = HTTPBearer(auto_error=False)

settings = get_settings()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-service")

app = FastAPI(title="Rentlora AI Service", version=settings.app_version)
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
    logger.info("ai-service started on port 8003")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-service"}


@app.get("/healthz")
async def healthz():
    """Liveness probe — cheap, no dependencies."""
    return {"status": "ok"}


@app.get("/ready")
async def ready():
    """Readiness probe — ai-service has no backing store to check."""
    return {"status": "ready"}


@app.post("/api/ai/description", response_model=PropertyDescriptionResponse)
async def generate_description(payload: PropertyDescriptionRequest, user=Depends(get_current_user)):
    if user["role"] not in ("host", "admin"):
        raise HTTPException(status_code=403, detail="Host or admin role required")
    return PropertyDescriptionResponse(description=generate_property_description(payload))


@app.post("/api/ai/embed", response_model=EmbedResponse)
async def create_embedding(payload: EmbedRequest, user=Depends(get_current_user)):
    if user["role"] not in ("host", "admin"):
        raise HTTPException(status_code=403, detail="Host or admin role required")
    return EmbedResponse(embedding=generate_embedding(payload.text))


@app.post("/api/ai/rag", response_model=RagResponse)
async def create_rag_summary(payload: RagRequest, user=Depends(get_current_user)):
    return RagResponse(summary=generate_rag_response(payload.query, payload.properties))


@app.post("/api/ai/chat", response_model=ChatResponse)
async def chat_with_agent(
    payload: ChatRequest,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    token = None
    if creds:
        token = creds.credentials
    return run_agent_chat(payload.message, payload.history, token)


