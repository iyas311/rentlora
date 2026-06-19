from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal

class SearchRequest(BaseModel):
    query: str
    limit: int = 5

class PropertyResponse(BaseModel):
    id: int
    title: str
    city: str
    country: str
    price_per_night: float
    description: Optional[str]
    first_image: Optional[str]

class SearchResponse(BaseModel):
    summary: str
    properties: List[PropertyResponse]
