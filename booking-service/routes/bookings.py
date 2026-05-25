from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, case, desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user
from database import get_db
from models import Booking, Property, User
from schemas import BookingCreateRequest

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _first_image(images):
    if isinstance(images, list) and images:
        return images[0]
    return None


def _booking_detail_payload(booking: Booking, guest: User, prop: Property):
    return {
        "id": booking.id,
        "check_in": booking.check_in,
        "check_out": booking.check_out,
        "guests_count": booking.guests_count,
        "total_nights": booking.total_nights,
        "total_price": booking.total_price,
        "status": booking.status,
        "created_at": booking.created_at,
        "guest": {"id": guest.id, "name": guest.name, "email": guest.email},
        "property": {
            "id": prop.id,
            "title": prop.title,
            "city": prop.city,
            "location": prop.location,
            "price_per_night": prop.price_per_night,
            "first_image": _first_image(prop.images),
        },
    }


@router.get("/my")
async def my_bookings(
    status: str = Query(default="all", pattern="^(upcoming|past|cancelled|all)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "guest":
        raise HTTPException(status_code=403, detail="Only guests can access this endpoint")
    today = date.today()
    stmt = (
        select(Booking, Property)
        .join(Property, Property.id == Booking.property_id)
        .where(Booking.guest_id == current_user.id)
    )
    if status == "upcoming":
        stmt = stmt.where(and_(Booking.status == "confirmed", Booking.check_in >= today)).order_by(Booking.check_in.asc())
    elif status == "past":
        stmt = stmt.where(Booking.check_out < today).order_by(Booking.check_out.desc())
    elif status == "cancelled":
        stmt = stmt.where(Booking.status == "cancelled").order_by(Booking.check_out.desc())
    else:
        stmt = stmt.order_by(
            case((and_(Booking.status == "confirmed", Booking.check_in >= today), 0), else_=1),
            Booking.check_in.asc(),
            Booking.created_at.desc(),
        )
    rows = (await db.execute(stmt)).all()
    return [
        {
            "id": b.id,
            "check_in": b.check_in,
            "check_out": b.check_out,
            "guests_count": b.guests_count,
            "total_nights": b.total_nights,
            "total_price": b.total_price,
            "status": b.status,
            "created_at": b.created_at,
            "property": {
                "id": p.id,
                "title": p.title,
                "city": p.city,
                "location": p.location,
                "price_per_night": p.price_per_night,
                "first_image": _first_image(p.images),
            },
        }
        for b, p in rows
    ]


@router.get("/host/mine")
async def host_bookings(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "host":
        raise HTTPException(status_code=403, detail="Only hosts can access this endpoint")
    stmt = (
        select(Booking, User, Property)
        .join(User, User.id == Booking.guest_id)
        .join(Property, Property.id == Booking.property_id)
        .where(Property.host_id == current_user.id)
        .order_by(desc(Booking.created_at))
    )
    rows = (await db.execute(stmt)).all()
    return [
        {
            "id": b.id,
            "check_in": b.check_in,
            "check_out": b.check_out,
            "guests_count": b.guests_count,
            "total_price": b.total_price,
            "status": b.status,
            "guest": {"id": g.id, "name": g.name, "email": g.email},
            "property": {"id": p.id, "title": p.title, "city": p.city, "location": p.location, "price_per_night": p.price_per_night},
        }
        for b, g, p in rows
    ]


@router.get("/{booking_id}")
async def get_booking(booking_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    row = (
        await db.execute(
            select(Booking, User, Property)
            .join(User, User.id == Booking.guest_id)
            .join(Property, Property.id == Booking.property_id)
            .where(Booking.id == booking_id)
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking, guest, prop = row
    if current_user.id not in (booking.guest_id, prop.host_id):
        raise HTTPException(status_code=403, detail="Forbidden")
    return _booking_detail_payload(booking, guest, prop)


@router.post("")
async def create_booking(
    payload: BookingCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "guest":
        raise HTTPException(status_code=403, detail="Only guests can create bookings")

    prop = await db.scalar(select(Property).where(Property.id == payload.property_id, Property.is_available.is_(True)))
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found or unavailable")
    if prop.host_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot book your own property")

    tomorrow = date.today() + timedelta(days=1)
    if payload.check_in < tomorrow:
        raise HTTPException(status_code=400, detail="check_in must be at least tomorrow")
    if payload.check_out <= payload.check_in:
        raise HTTPException(status_code=400, detail="check_out must be after check_in")
    if payload.guests_count < 1 or payload.guests_count > prop.max_guests:
        raise HTTPException(status_code=400, detail="Invalid guests_count for this property")

    overlap = await db.scalar(
        select(Booking.id).where(
            Booking.property_id == payload.property_id,
            Booking.status == "confirmed",
            ~or_(Booking.check_out <= payload.check_in, Booking.check_in >= payload.check_out),
        )
    )
    if overlap:
        raise HTTPException(status_code=409, detail="Property is not available for selected dates")

    total_nights = (payload.check_out - payload.check_in).days
    total_price = Decimal(total_nights) * prop.price_per_night
    booking = Booking(
        guest_id=current_user.id,
        property_id=payload.property_id,
        check_in=payload.check_in,
        check_out=payload.check_out,
        guests_count=payload.guests_count,
        total_nights=total_nights,
        total_price=total_price,
        status="confirmed",
    )
    db.add(booking)
    await db.commit()
    await db.refresh(booking)
    return _booking_detail_payload(booking, current_user, prop)


@router.put("/{booking_id}/cancel")
async def cancel_booking(booking_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    row = (
        await db.execute(
            select(Booking, Property)
            .join(Property, Property.id == Booking.property_id)
            .where(Booking.id == booking_id)
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking, prop = row
    if current_user.id not in (booking.guest_id, prop.host_id):
        raise HTTPException(status_code=403, detail="Forbidden")
    if booking.status != "confirmed":
        raise HTTPException(status_code=400, detail="Only confirmed bookings can be cancelled")
    if current_user.id == booking.guest_id:
        cutoff = datetime.now(timezone.utc) + timedelta(hours=48)
        check_in_dt = datetime.combine(booking.check_in, datetime.min.time()).replace(tzinfo=timezone.utc)
        if check_in_dt <= cutoff:
            raise HTTPException(status_code=403, detail="Guests can only cancel more than 48 hours before check-in")
    booking.status = "cancelled"
    db.add(booking)
    await db.commit()
    await db.refresh(booking)
    guest = await db.scalar(select(User).where(User.id == booking.guest_id))
    return _booking_detail_payload(booking, guest, prop)
