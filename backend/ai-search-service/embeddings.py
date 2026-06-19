import json

import boto3
from config import settings

bedrock = boto3.client("bedrock-runtime", region_name=settings.AWS_DEFAULT_REGION)

def generate_embedding(text: str) -> list[float]:
    """Generates a 1024-dimensional embedding using Amazon Titan."""
    response = bedrock.invoke_model(
        modelId=settings.EMBEDDING_MODEL_ID,
        body=json.dumps({"inputText": text}),
        contentType="application/json",
        accept="application/json"
    )
    result = json.loads(response["body"].read())
    return result["embedding"]

def generate_property_summary_and_ranking(query: str, context: str) -> dict:
    """Generates a conversational summary and identifies relevant properties using Amazon Nova."""
    prompt = f"""
    You are an AI search assistant for Rentlora, a property rental platform.
    A user has searched for: "{query}"

    Here are the top properties retrieved from our database:
    {context}

    Your task is to analyze these properties and determine which of them are actually relevant to the user's query.
    Return a JSON object with the following fields:
    - "summary": A brief, friendly summary (max 3 sentences) recommending the best options to the user based on their query. If nothing matches, explain that politely.
    - "relevant_titles": A list of property titles (exact match from the list above) that are actually relevant to the user's search query. Do not include irrelevant recommendations here.

    Example output:
    {{
      "summary": "We found a beautiful penthouse in Paris which matches your request.",
      "relevant_titles": ["Chic Parisian Luxury Penthouse"]
    }}

    Return ONLY the valid JSON object. Do not include any other text, markdown formatting (like ```json), or wrapping.
    """

    response = bedrock.invoke_model(
        modelId=settings.NOVA_MODEL_ID,
        body=json.dumps({
            "messages": [{"role": "user", "content": [{"text": prompt}]}],
            "inferenceConfig": {"maxTokens": 400, "temperature": 0.3}
        }),
        contentType="application/json",
        accept="application/json"
    )
    result = json.loads(response["body"].read())
    text_output = result.get("output", {}).get("message", {}).get("content", [{"text": "{}"}])[0].get("text", "").strip()

    # Strip markdown code blocks if present
    if text_output.startswith("```json"):
        text_output = text_output[7:]
    elif text_output.startswith("```"):
        text_output = text_output[3:]
    if text_output.endswith("```"):
        text_output = text_output[:-3]
    text_output = text_output.strip()

    try:
        data = json.loads(text_output)
        return {
            "summary": data.get("summary", "Here are the closest properties we found."),
            "relevant_titles": data.get("relevant_titles", [])
        }
    except Exception:
        # Fallback: if not valid JSON, treat the entire output as summary and do not filter properties
        return {
            "summary": text_output,
            "relevant_titles": None
        }
