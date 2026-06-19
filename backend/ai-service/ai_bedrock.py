import json
import logging
from functools import lru_cache

import boto3
from botocore.exceptions import ClientError
from fastapi import HTTPException

from config import get_settings
from schemas import PropertyDescriptionRequest

logger = logging.getLogger("ai-service.bedrock")

# We will use Amazon Nova Lite for descriptions and RAG summaries
NOVA_MODEL_ID = "amazon.nova-lite-v1:0"
# We will use Amazon Titan Text Embeddings V2 for vector embeddings
EMBEDDING_MODEL_ID = "amazon.titan-embed-text-v2:0"


@lru_cache
def _get_bedrock_client():
    settings = get_settings()
    return boto3.client("bedrock-runtime", region_name=settings.aws_default_region)


def _format_amenities(amenities: list[str]) -> str:
    clean = [item.strip() for item in amenities if item and item.strip()]
    return ", ".join(clean) if clean else "No special amenities listed"


def generate_property_description(payload: PropertyDescriptionRequest) -> str:
    """Generates a warm, booking-friendly property description using Amazon Nova."""
    client = _get_bedrock_client()
    
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

    body = json.dumps({
        "messages": [
            {
                "role": "user",
                "content": [{"text": prompt}]
            }
        ],
        "system": [{"text": "You are a professional real estate copywriter."}],
        "inferenceConfig": {
            "max_new_tokens": 300,
            "temperature": 0.7,
            "top_p": 0.9,
        }
    })

    try:
        response = client.invoke_model(
            modelId=NOVA_MODEL_ID,
            contentType="application/json",
            accept="application/json",
            body=body
        )
        response_body = json.loads(response.get('body').read())
        # Nova Converse API format
        description = response_body.get("output", {}).get("message", {}).get("content", [{}])[0].get("text", "").strip()
        
        if not description:
            raise HTTPException(status_code=502, detail="AI description generation returned an empty result")
            
        logger.info(f"Successfully generated description for property '{payload.title}'")
        return description
        
    except ClientError as e:
        logger.error(f"Bedrock API Call Failed: {e}")
        raise HTTPException(status_code=502, detail="AI description generation failed") from e
    except Exception as e:
        logger.error(f"Unexpected error in Bedrock call: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during AI generation") from e


def generate_embedding(text: str) -> list[float]:
    """Generates a 1024-dimension vector embedding using Amazon Titan."""
    client = _get_bedrock_client()
    
    body = json.dumps({
        "inputText": text,
        "dimensions": 1024,
        "normalize": True
    })

    try:
        response = client.invoke_model(
            modelId=EMBEDDING_MODEL_ID,
            contentType="application/json",
            accept="application/json",
            body=body
        )
        response_body = json.loads(response.get('body').read())
        embedding = response_body.get("embedding")
        
        if not embedding:
            raise HTTPException(status_code=502, detail="AI embedding generation returned an empty result")
            
        return embedding
        
    except ClientError as e:
        logger.error(f"Bedrock API Call Failed for embedding: {e}")
        raise HTTPException(status_code=502, detail="AI embedding generation failed") from e


def generate_rag_response(query: str, properties: list[dict]) -> str:
    """Generates a conversational summary answering the user's query based on the provided properties."""
    client = _get_bedrock_client()
    
    # Format the context from the properties
    context_str = ""
    for i, prop in enumerate(properties, 1):
        context_str += f"\nProperty {i}:\n"
        context_str += f"Title: {prop.get('title')}\n"
        context_str += f"Location: {prop.get('city')}, {prop.get('country')}\n"
        context_str += f"Price: ${prop.get('price_per_night')} per night\n"
        context_str += f"Capacity: {prop.get('max_guests')} guests, {prop.get('bedrooms')} beds, {prop.get('bathrooms')} baths\n"
        context_str += f"Description: {prop.get('description')}\n"
    
    prompt = f"""
You are a helpful vacation rental assistant for Rentlora.
A user is searching for properties. I have retrieved the best matching properties based on their search.
Your job is to provide a brief, friendly, conversational summary of these results to the user.

User's search query: "{query}"

Here are the top matching properties we found:
{context_str}

Instructions:
- Write a short, friendly response (2-3 paragraphs max).
- Highlight why some of these properties are good matches for their query.
- Mention specific properties by their Title.
- Do not make up any information about the properties that is not in the context provided.
- If the properties don't seem like a perfect match, politely acknowledge that these are the closest options we have.
"""

    body = json.dumps({
        "messages": [
            {
                "role": "user",
                "content": [{"text": prompt}]
            }
        ],
        "inferenceConfig": {
            "max_new_tokens": 500,
            "temperature": 0.5,
        }
    })

    try:
        response = client.invoke_model(
            modelId=NOVA_MODEL_ID,
            contentType="application/json",
            accept="application/json",
            body=body
        )
        response_body = json.loads(response.get('body').read())
        answer = response_body.get("output", {}).get("message", {}).get("content", [{}])[0].get("text", "").strip()
        return answer
        
    except ClientError as e:
        logger.error(f"Bedrock API Call Failed for RAG: {e}")
        raise HTTPException(status_code=502, detail="AI summary generation failed") from e
