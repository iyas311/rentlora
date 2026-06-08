from fastapi import APIRouter, Depends, HTTPException

from ai_description import generate_property_description
from auth import get_current_user
from schemas import PropertyDescriptionRequest, PropertyDescriptionResponse

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/description", response_model=PropertyDescriptionResponse)
async def generate_description(payload: PropertyDescriptionRequest, user=Depends(get_current_user)):
    if user["role"] not in ("host", "admin"):
        raise HTTPException(status_code=403, detail="Host or admin role required")
    return PropertyDescriptionResponse(description=generate_property_description(payload))
