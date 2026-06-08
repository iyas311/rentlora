import logging
import time

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from auth import get_current_user
from schemas import PropertyDescriptionRequest, PropertyDescriptionResponse
from ai_description import generate_property_description

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


@app.post("/api/ai/description", response_model=PropertyDescriptionResponse)
async def generate_description(payload: PropertyDescriptionRequest, user=Depends(get_current_user)):
    if user["role"] not in ("host", "admin"):
        raise HTTPException(status_code=403, detail="Host or admin role required")
    return PropertyDescriptionResponse(description=generate_property_description(payload))
