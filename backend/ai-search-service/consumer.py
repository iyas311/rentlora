"""SQS consumer for ai-search-service.

Long-polls the `property-sync` queue. For each message it fetches the property
from the database, generates a fresh embedding via Bedrock, and persists it.
Messages are only deleted on success — failures fall back to the queue's
visibility timeout and ultimately the Dead Letter Queue.

AWS calls use the pod's IRSA ServiceAccount identity (no static credentials).
"""
import asyncio
import json
import logging

import boto3
from config import settings
from database import AsyncSessionLocal
from embeddings import generate_embedding
from models import Property
from sqlalchemy import select

logger = logging.getLogger(__name__)


def _sqs_client():
    return boto3.client("sqs", region_name=settings.AWS_DEFAULT_REGION)


async def _embed_property(property_id: int):
    async with AsyncSessionLocal() as session:
        prop = await session.scalar(select(Property).where(Property.id == property_id))
        if not prop:
            logger.warning(f"Property {property_id} not found; skipping embedding")
            return
        text_to_embed = (
            f"Title: {prop.title}. City: {prop.city}. "
            f"Description: {prop.description or ''} Max Guests: {prop.max_guests}. "
            f"Bedrooms: {prop.bedrooms}."
        )
        # generate_embedding is a blocking boto3 call -> run off the event loop
        vector = await asyncio.to_thread(generate_embedding, text_to_embed)
        prop.embedding = vector
        session.add(prop)
        await session.commit()
        logger.info(f"Embedded property {property_id} from SQS event")


async def consume_property_sync():
    """Continuously poll the property-sync queue and process messages."""
    queue_url = settings.PROPERTY_SYNC_QUEUE_URL
    client = _sqs_client()
    logger.info(f"Starting SQS consumer for {queue_url}")

    while True:
        try:
            resp = await asyncio.to_thread(
                client.receive_message,
                QueueUrl=queue_url,
                MaxNumberOfMessages=10,
                WaitTimeSeconds=20,  # long polling
                VisibilityTimeout=60,
            )
            messages = resp.get("Messages", [])
            if not messages:
                continue

            for msg in messages:
                try:
                    body = json.loads(msg["Body"])
                    property_id = body.get("property_id")
                    if property_id is not None:
                        await _embed_property(int(property_id))
                    # Delete only after successful processing
                    await asyncio.to_thread(
                        client.delete_message,
                        QueueUrl=queue_url,
                        ReceiptHandle=msg["ReceiptHandle"],
                    )
                except Exception as e:
                    # Leave the message: visibility timeout will re-deliver, then DLQ
                    logger.error(f"Failed to process SQS message: {e}")
        except Exception as e:
            logger.error(f"SQS receive loop error: {e}")
            await asyncio.sleep(5)
