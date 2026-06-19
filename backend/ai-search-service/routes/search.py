from database import get_db
from embeddings import generate_embedding, generate_property_summary_and_ranking
from fastapi import APIRouter, Depends, HTTPException
from models import Property
from schemas import SearchRequest, SearchResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

@router.post("/ai", response_model=SearchResponse)
async def ai_search(request: SearchRequest, db: AsyncSession = Depends(get_db)):
    try:
        # 1. Generate embedding for user's query
        query_embedding = generate_embedding(request.query)

        # 2. Vector search in PostgreSQL using pgvector's <-> operator (L2 distance)
        # We only search properties that have embeddings and are available
        stmt = (
            select(Property)
            .where(Property.is_available.is_(True))
            .where(Property.embedding.is_not(None))
            .order_by(Property.embedding.l2_distance(query_embedding))
            .limit(request.limit)
        )
        result = await db.execute(stmt)
        top_properties = result.scalars().all()

        if not top_properties:
            return SearchResponse(
                summary="I couldn't find any properties matching your request.",
                properties=[]
            )

        # 3. Build context for Nova
        context_lines = []
        for p in top_properties:
            context_lines.append(
                f"- {p.title} in {p.city} (${p.price_per_night}/night): {p.description or ''}"
            )
        context_str = "\n".join(context_lines)

        # 4. Generate conversational summary and filter relevant properties
        ai_data = generate_property_summary_and_ranking(request.query, context_str)
        summary = ai_data["summary"]
        relevant_titles = ai_data["relevant_titles"]

        if relevant_titles is not None:
            relevant_titles_lower = [t.lower().strip() for t in relevant_titles]
            top_properties = [
                p for p in top_properties
                if any(t in p.title.lower() or p.title.lower() in t for t in relevant_titles_lower)
            ]

        # 5. Return JSON
        props_out = [
            {
                "id": p.id,
                "title": p.title,
                "city": p.city,
                "country": p.country,
                "price_per_night": float(p.price_per_night),
                "description": p.description,
                "first_image": p.images[0] if isinstance(p.images, list) and p.images else None
            }
            for p in top_properties
        ]

        return SearchResponse(summary=summary, properties=props_out)

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
