from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import distinct, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Property

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/cities")
async def cities(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(distinct(Property.city)).where(Property.is_available.is_(True)).order_by(Property.city))).all()
    return {"cities": [r[0] for r in rows if r[0]]}


@router.get("/suggestions")
async def suggestions(q: str = Query(min_length=2), db: AsyncSession = Depends(get_db)):
    if len(q.strip()) < 2:
        raise HTTPException(status_code=400, detail="q must be at least 2 characters")
    term = f"%{q.strip()}%"
    city_rows = (await db.execute(select(distinct(Property.city)).where(Property.city.ilike(term)).limit(5))).all()
    property_rows = (await db.execute(select(Property.id, Property.title).where(Property.title.ilike(term)).limit(5))).all()
    items = [{"type": "city", "label": c[0], "id": None} for c in city_rows]
    items.extend([{"type": "property", "label": p.title, "id": p.id} for p in property_rows])
    return {"suggestions": items}
