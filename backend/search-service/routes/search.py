from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Property
from schemas import SearchRequest, SearchResponse
from embeddings import generate_embedding, generate_property_summary

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
            .where(Property.is_available == True)
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
        
        # 4. Generate conversational summary
        summary = generate_property_summary(request.query, context_str)
        
        # 5. Return JSON
        props_out = [
            {
                "id": p.id,
                "title": p.title,
                "city": p.city,
                "price_per_night": float(p.price_per_night),
                "description": p.description
            }
            for p in top_properties
        ]
        
        return SearchResponse(summary=summary, properties=props_out)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
