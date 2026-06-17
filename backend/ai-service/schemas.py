from decimal import Decimal
from typing import Optional
from pydantic import BaseModel


class PropertyDescriptionRequest(BaseModel):
    title: str
    city: str
    country: str = "India"
    property_type: str
    location: Optional[str] = None
    price_per_night: Optional[Decimal] = None
    max_guests: int = 1
    bedrooms: int = 1
    bathrooms: int = 1
    amenities: list[str] = []


class PropertyDescriptionResponse(BaseModel):
    description: str


class EmbedRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    embedding: list[float]


class RagRequest(BaseModel):
    query: str
    properties: list[dict]


class RagResponse(BaseModel):
    summary: str

