import boto3
import json
from config import settings

bedrock = boto3.client("bedrock-runtime", region_name=settings.AWS_DEFAULT_REGION)

def generate_embedding(text: str) -> list[float]:
    """Generates a 1024-dimensional embedding using Amazon Titan."""
    response = bedrock.invoke_model(
        modelId="amazon.titan-embed-text-v2:0",
        body=json.dumps({"inputText": text}),
        contentType="application/json",
        accept="application/json"
    )
    result = json.loads(response["body"].read())
    return result["embedding"]

def generate_property_summary(query: str, context: str) -> str:
    """Generates a conversational summary using Amazon Nova."""
    prompt = f"""
    You are an AI assistant for Rentlora, a property rental platform.
    A user has searched for: "{query}"

    Here are the top matching properties from our database:
    {context}

    Please write a brief, friendly summary (max 3 sentences) recommending the best options to the user based on their query. Don't invent properties that aren't in the context.
    """
    
    response = bedrock.invoke_model(
        modelId="amazon.nova-lite-v1:0",
        body=json.dumps({
            "messages": [{"role": "user", "content": [{"text": prompt}]}],
            "inferenceConfig": {"maxTokens": 300, "temperature": 0.5}
        }),
        contentType="application/json",
        accept="application/json"
    )
    result = json.loads(response["body"].read())
    # Extract text from Nova response format
    return result.get("output", {}).get("message", {}).get("content", [{"text": ""}])[0].get("text", "")
