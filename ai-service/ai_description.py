from functools import lru_cache

from fastapi import HTTPException
from openai import OpenAI

from config import get_settings
from schemas import PropertyDescriptionRequest


def _format_amenities(amenities: list[str]) -> str:
    clean = [item.strip() for item in amenities if item and item.strip()]
    return ", ".join(clean) if clean else "No special amenities listed"


@lru_cache
def _get_xai_client(api_key: str) -> OpenAI:
    return OpenAI(api_key=api_key, base_url="https://api.x.ai/v1")


def generate_property_description(payload: PropertyDescriptionRequest) -> str:
    settings = get_settings()
    if not settings.xai_api_key:
        raise HTTPException(status_code=503, detail="AI description generation is not configured")

    client = _get_xai_client(settings.xai_api_key)
    prompt = f"""
Write a polished vacation rental description for a property listing.

Property details:
- Title: {payload.title}
- Property type: {payload.property_type}
- City: {payload.city}
- Country: {payload.country}
- Location details: {payload.location or "Not provided"}
- Price per night: {payload.price_per_night or "Not provided"}
- Max guests: {payload.max_guests}
- Bedrooms: {payload.bedrooms}
- Bathrooms: {payload.bathrooms}
- Amenities: {_format_amenities(payload.amenities)}

Requirements:
- Return only the final description text.
- Keep it between 90 and 140 words.
- Make it warm, specific, and booking-friendly.
- Do not invent amenities, landmarks, ratings, or policies.
- Avoid bullet points, hashtags, and emojis.
""".strip()

    try:
        response = client.with_options(timeout=settings.xai_timeout_seconds).responses.create(
            model=settings.xai_model,
            input=prompt,
        )
    except Exception as exc:
        import logging
        logger = logging.getLogger("ai-service")
        error_msg = str(exc)
        if hasattr(exc, "response") and exc.response is not None:
            try:
                error_msg = f"{exc.response.text}"
            except Exception:
                pass
        logger.error(f"xAI API Call Failed: {error_msg}")
        raise HTTPException(status_code=502, detail=f"AI description generation failed: {error_msg}") from exc

    description = (response.output_text or "").strip()
    if not description:
        raise HTTPException(status_code=502, detail="AI description generation returned an empty result")
    return description
