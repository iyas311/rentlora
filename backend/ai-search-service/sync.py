import asyncio
import logging

from database import AsyncSessionLocal
from embeddings import generate_embedding
from models import Property
from sqlalchemy import select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def backfill_embeddings():
    """Runs continuously in the background to embed new properties."""
    while True:
        try:
            async with AsyncSessionLocal() as session:
                # Find up to 10 properties without embeddings
                stmt = select(Property).where(Property.embedding.is_(None)).limit(10)
                result = await session.execute(stmt)
                properties = result.scalars().all()

                if properties:
                    logger.info(f"Found {len(properties)} properties without embeddings. Processing...")
                    for prop in properties:
                        # Create a rich text representation for the vector model
                        text_to_embed = f"Title: {prop.title}. City: {prop.city}. Description: {prop.description or ''} Max Guests: {prop.max_guests}. Bedrooms: {prop.bedrooms}."
                        try:
                            vector = generate_embedding(text_to_embed)
                            prop.embedding = vector
                            session.add(prop)
                        except Exception as e:
                            logger.error(f"Failed to embed property {prop.id}: {e}")

                    await session.commit()
                    logger.info("Batch embedded successfully.")

                # Always sleep for a bit to avoid tight CPU spinning and rate limits
                await asyncio.sleep(10)
        except Exception as e:
            logger.error(f"Error in sync background task: {e}")
            await asyncio.sleep(10)
