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
    price_per_night: float
    description: Optional[str]

class SearchResponse(BaseModel):
    summary: str
    properties: List[PropertyResponse]
