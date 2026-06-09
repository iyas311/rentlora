from datetime import date
from math import ceil

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

import logging
from auth import get_current_user
from database import get_db
from storage import upload_property_image
from models import Booking, Property, Review, User
from schemas import PropertyCreate, PropertyUpdate

logger = logging.getLogger("property-service.routes.properties")
router = APIRouter(prefix="/properties", tags=["properties"])


def _first_image(images):
    return images[0] if isinstance(images, list) and images else None


async def _property_card_query(db: AsyncSession, filters, page, limit):
    rating_avg = func.coalesce(func.avg(Review.rating), 0).label("rating_avg")
    review_count = func.count(Review.id).label("review_count")
    stmt = (
        select(Property, rating_avg, review_count)
        .outerjoin(Review, Review.property_id == Property.id)
        .where(Property.is_available.is_(True), *filters)
        .group_by(Property.id)
    )
    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = (await db.execute(stmt.offset((page - 1) * limit).limit(limit))).all()
    return rows, total or 0


@router.get("")
async def list_properties(
    city: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    type: str | None = Query(default=None, pattern="^(apartment|house|villa|studio)$"),
    guests: int | None = None,
    bedrooms: int | None = None,
    check_in: date | None = None,
    check_out: date | None = None,
    page: int = 1,
    limit: int = 12,
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if city:
        filters.append(Property.city.ilike(f"%{city.strip()}%"))
    if min_price is not None:
        filters.append(Property.price_per_night >= min_price)
    if max_price is not None:
        filters.append(Property.price_per_night <= max_price)
    if type:
        filters.append(Property.property_type == type)
    if guests:
        filters.append(Property.max_guests >= guests)
    if bedrooms:
        filters.append(Property.bedrooms >= bedrooms)
    if check_in and check_out:
        unavailable_subq = (
            select(Booking.property_id)
            .where(
                Booking.status == "confirmed",
                ~or_(Booking.check_out <= check_in, Booking.check_in >= check_out),
            )
            .distinct()
        )
        filters.append(~Property.id.in_(unavailable_subq))
    rows, total = await _property_card_query(db, filters, page, limit)
    items = [
        {
            "id": p.id,
            "title": p.title,
            "city": p.city,
            "country": p.country,
            "price_per_night": p.price_per_night,
            "property_type": p.property_type,
            "max_guests": p.max_guests,
            "bedrooms": p.bedrooms,
            "rating_avg": round(float(avg), 2),
            "review_count": count,
            "first_image": _first_image(p.images),
            "is_available": p.is_available,
        }
        for p, avg, count in rows
    ]
    return {"items": items, "total": total, "page": page, "pages": ceil(total / limit) if total else 0}


@router.get("/{property_id}")
async def get_property(property_id: int, db: AsyncSession = Depends(get_db)):
    row = (
        await db.execute(
            select(Property, User, func.coalesce(func.avg(Review.rating), 0), func.count(Review.id))
            .join(User, User.id == Property.host_id)
            .outerjoin(Review, Review.property_id == Property.id)
            .where(Property.id == property_id, Property.is_available.is_(True))
            .group_by(Property.id, User.id)
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Property not found")
    p, h, avg, count = row
    return {
        "id": p.id,
        "host_id": p.host_id,
        "host_name": h.name,
        "host_avatar": h.avatar_url,
        "host_member_since": h.created_at,
        "title": p.title,
        "description": p.description,
        "location": p.location,
        "city": p.city,
        "country": p.country,
        "price_per_night": p.price_per_night,
        "max_guests": p.max_guests,
        "bedrooms": p.bedrooms,
        "bathrooms": p.bathrooms,
        "property_type": p.property_type,
        "amenities": p.amenities,
        "images": p.images,
        "is_available": p.is_available,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
        "rating_avg": round(float(avg), 2),
        "review_count": count,
    }


@router.post("")
async def create_property(payload: PropertyCreate, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    if user["role"] not in ("host", "admin"):
        raise HTTPException(status_code=403, detail="Host or admin role required")
    prop = Property(host_id=user["id"], **payload.model_dump())
    db.add(prop)
    await db.commit()
    await db.refresh(prop)
    logger.info(f"Property {prop.id} created successfully by host {user['id']}")
    return await get_property(prop.id, db)


@router.put("/{property_id}")
async def update_property(property_id: int, payload: PropertyUpdate, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    prop = await db.scalar(select(Property).where(Property.id == property_id))
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    if user["role"] != "admin" and prop.host_id != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(prop, field, value)
    db.add(prop)
    await db.commit()
    await db.refresh(prop)
    return await get_property(prop.id, db)


@router.delete("/{property_id}")
async def delete_property(property_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    prop = await db.scalar(select(Property).where(Property.id == property_id))
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    if user["role"] != "admin" and prop.host_id != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    prop.is_available = False
    db.add(prop)
    await db.commit()
    logger.info(f"Property {property_id} was deleted (marked unavailable) by user {user['id']}")
    return {"message": "Property removed"}


@router.post("/{property_id}/images")
async def upload_images(
    property_id: int,
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    prop = await db.scalar(select(Property).where(Property.id == property_id))
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    if prop.host_id != user["id"]:
        raise HTTPException(status_code=403, detail="Only property host can upload images")
    if len(files) > 5:
        raise HTTPException(status_code=400, detail="Max 5 files allowed")
    existing = list(prop.images or [])
    for f in files:
        existing.append(await upload_property_image(property_id, f))
    prop.images = existing
    db.add(prop)
    await db.commit()
    logger.info(f"Successfully added {len(files)} images to property {property_id}")
    return {"images": prop.images}


@router.get("/{property_id}/availability")
async def get_availability(property_id: int, check_in: date, check_out: date, db: AsyncSession = Depends(get_db)):
    if check_out <= check_in:
        raise HTTPException(status_code=400, detail="check_out must be after check_in")
    booked = (
        await db.execute(
            select(Booking.check_in, Booking.check_out).where(
                Booking.property_id == property_id,
                Booking.status == "confirmed",
                ~or_(Booking.check_out <= check_in, Booking.check_in >= check_out),
            )
        )
    ).all()
    ranges = [{"check_in": r.check_in, "check_out": r.check_out} for r in booked]
    return {"available": len(ranges) == 0, "booked_ranges": ranges}
