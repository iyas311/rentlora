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


def _http_request(url: str, method: str = "GET", data: dict = None, token: str = None) -> dict:
    """Helper to perform HTTP requests to other local microservices."""
    headers = {
        "Content-Type": "application/json"
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
        
    req_body = None
    if data is not None:
        req_body = json.dumps(data).encode("utf-8")
        
    req = urllib.request.Request(url, data=req_body, headers=headers, method=method)
    try:
        import urllib.request
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        logger.error(f"HTTP request to {url} failed: {e}")
        return {"error": str(e)}


AGENT_TOOLS = [
    {
        "toolSpec": {
            "name": "search_properties",
            "description": "Finds property rentals by matching location, description, or natural language query (e.g. 'cabin in the mountains', 'beachfront house in Nice'). Returns a list of properties.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "The search term or natural language description of properties."
                        }
                    },
                    "required": ["query"]
                }
            }
        }
    },
    {
        "toolSpec": {
            "name": "get_my_bookings",
            "description": "Retrieves the list of existing bookings/reservations made by the current user.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {}
                }
            }
        }
    },
    {
        "toolSpec": {
            "name": "create_booking",
            "description": "Reserves/books a property for specific check-in and check-out dates.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "property_id": {
                            "type": "integer",
                            "description": "The numeric ID of the property to reserve."
                        },
                        "check_in": {
                            "type": "string",
                            "description": "Check-in date in YYYY-MM-DD format."
                        },
                        "check_out": {
                            "type": "string",
                            "description": "Check-out date in YYYY-MM-DD format."
                        }
                    },
                    "required": ["property_id", "check_in", "check_out"]
                }
            }
        }
    }
]


SYSTEM_PROMPT = """
You are Rentlora's AI Concierge, a helpful and professional vacation rental assistant.
You can help users find properties, check their bookings, or book a property.

Instructions:
- Use search_properties to find properties matching the user's criteria.
- Use get_my_bookings to check their active reservations.
- Use create_booking to create a booking on behalf of the user. Ensure you have the property_id, check_in, and check_out dates.
- Keep responses friendly, warm, and concise.
- If you perform an action (like booking or searching), explain what you did and summarize the results nicely.
- Always guide the user through the process. If they want to book, but didn't specify dates, ask them for the check-in and check-out dates.
- If a tool execution fails or returns an error, explain it politely to the user.
"""


def run_agent_chat(message: str, history: list, token: str = None) -> dict:
    """Runs a conversational agent loop with tool-calling via Amazon Bedrock converse API."""
    import urllib.request
    client = _get_bedrock_client()
    
    # Format message history for Bedrock Converse API
    messages = []
    for msg in history:
        # Skip leading assistant messages because Bedrock requires starting with a user message
        if not messages and msg.role == "assistant":
            continue
        messages.append({
            "role": msg.role,
            "content": [{"text": msg.content}]
        })
        
    messages.append({
        "role": "user",
        "content": [{"text": message}]
    })
    
    properties_meta = []
    
    # Run the loop up to 5 times to handle consecutive tool calls
    for _ in range(5):
        try:
            response = client.converse(
                modelId=NOVA_MODEL_ID,
                messages=messages,
                system=[{"text": SYSTEM_PROMPT}],
                inferenceConfig={
                    "maxTokens": 800,
                    "temperature": 0.3
                },
                toolConfig={"tools": AGENT_TOOLS}
            )
            
            output_msg = response["output"]["message"]
            messages.append(output_msg)
            
            if response.get("stopReason") == "toolUse":
                tool_results = []
                for content in output_msg.get("content", []):
                    if "toolUse" in content:
                        tool_use = content["toolUse"]
                        name = tool_use["name"]
                        tool_use_id = tool_use["toolUseId"]
                        args = tool_use.get("input", {})
                        
                        logger.info(f"Agent requested tool call: {name} with args {args}")
                        
                        # Execute the requested tool
                        if name == "search_properties":
                            res = _http_request(
                                "http://search-service:8005/api/search/ai",
                                method="POST",
                                data={"query": args.get("query"), "limit": 4}
                            )
                            # Extract properties list to return as metadata to the UI
                            if isinstance(res, dict) and "properties" in res:
                                properties_meta = res["properties"]
                                
                        elif name == "get_my_bookings":
                            res = _http_request(
                                "http://booking-service:8002/api/bookings",
                                method="GET",
                                token=token
                            )
                            
                        elif name == "create_booking":
                            res = _http_request(
                                "http://booking-service:8002/api/bookings",
                                method="POST",
                                data={
                                    "property_id": args.get("property_id"),
                                    "check_in": args.get("check_in"),
                                    "check_out": args.get("check_out")
                                },
                                token=token
                            )
                        else:
                            res = {"error": f"Unknown tool: {name}"}
                            
                        tool_results.append({
                            "toolResult": {
                                "toolUseId": tool_use_id,
                                "content": [{"json": res}],
                                "status": "success" if "error" not in res else "error"
                            }
                        })
                
                # Append tool result responses as user message content
                messages.append({
                    "role": "user",
                    "content": tool_results
                })
                
                # Loop back to let the model generate a final text answer based on the tool results
                continue
                
            # If stopped normally, return the response text
            final_text = ""
            for content in output_msg.get("content", []):
                if "text" in content:
                    final_text += content["text"]
            
            return {
                "response": final_text.strip(),
                "properties": properties_meta
            }
            
        except ClientError as e:
            logger.error(f"Bedrock Agent Converse failed: {e}")
            raise HTTPException(status_code=502, detail=f"AI Agent failed: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error in agent loop: {e}")
            raise HTTPException(status_code=500, detail="Internal server error in AI Agent")
            
    # Fallback if loop exceeded limit
    return {
        "response": "I ran into a loop issue trying to solve your request. Please try again.",
        "properties": []
    }

