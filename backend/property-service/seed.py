import asyncio
import bcrypt
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from config import get_settings
from models import Property, User
from database import Base

# Sample real, high-quality Unsplash image URLs
IMAGES = [
    ["https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=800&q=80"], # Cozy Cabin
    ["https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=800&q=80"], # Beachfront Villa
    ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"], # Luxury Penthouse
    ["https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=800&q=80"], # Modern A-Frame
    ["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80"], # Forest Treehouse
    ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80"], # Tuscan Villa
    ["https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=800&q=80"], # Desert Oasis
    ["https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80"], # Mountain Lodge
    ["https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=800&q=80"], # Nordic Lakehouse
    ["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80"]  # Historic Cottage
]

PROPERTIES = [
    {
        "title": "Cozy Alpine A-Frame Cabin",
        "description": "Escape to the mountains in this beautiful, sun-drenched A-frame cabin. Surrounded by towering pines, this retreat offers a wood-burning stove, fully equipped kitchen, and a private hot tub perfect for stargazing.",
        "location": "Swiss Alps Valley Road 42",
        "city": "Zermatt",
        "country": "Switzerland",
        "price_per_night": Decimal("180.00"),
        "max_guests": 4,
        "bedrooms": 2,
        "bathrooms": 1,
        "property_type": "house",
        "amenities": ["Hot Tub", "Wood Stove", "Wifi", "Mountain View", "Kitchen", "Fireplace"],
        "images": IMAGES[0]
    },
    {
        "title": "Sunny Beachfront Paradise Villa",
        "description": "Step directly from your deck onto the powdery white sands. This luxury beachfront villa features panoramic ocean views, a private infinity pool, and open-concept indoor-outdoor living spaces.",
        "location": "Bounty Beach Lane 7",
        "city": "Bali",
        "country": "Indonesia",
        "price_per_night": Decimal("350.00"),
        "max_guests": 6,
        "bedrooms": 3,
        "bathrooms": 3,
        "property_type": "villa",
        "amenities": ["Infinity Pool", "Ocean View", "Air Conditioning", "Beach Access", "Wifi", "Chef Service"],
        "images": IMAGES[1]
    },
    {
        "title": "Chic Parisian Luxury Penthouse",
        "description": "Immerse yourself in Parisian elegance. This beautifully decorated penthouse apartment overlooks the Eiffel Tower and boasts classic high ceilings, a private balcony, and modern luxury finishes.",
        "location": "Avenue Montaigne 14",
        "city": "Paris",
        "country": "France",
        "price_per_night": Decimal("280.00"),
        "max_guests": 2,
        "bedrooms": 1,
        "bathrooms": 1,
        "property_type": "apartment",
        "amenities": ["Eiffel Tower View", "Balcony", "Coffee Maker", "Wifi", "Elevator", "Washing Machine"],
        "images": IMAGES[2]
    },
    {
        "title": "Minimalist Forest Sanctuary",
        "description": "A stunning architectural masterpiece designed to blend seamlessly into the forest. Enjoy floor-to-ceiling windows, high-end minimalist styling, and complete, peaceful isolation.",
        "location": "Deep Woods Path",
        "city": "Portland",
        "country": "United States",
        "price_per_night": Decimal("220.00"),
        "max_guests": 2,
        "bedrooms": 1,
        "bathrooms": 1,
        "property_type": "house",
        "amenities": ["Floor-to-ceiling Windows", "Forest View", "Fire Pit", "Wifi", "Minimalist Design", "Kitchen"],
        "images": IMAGES[3]
    },
    {
        "title": "Eco-Friendly Luxury Treehouse",
        "description": "Live among the birds in this elevated luxury treehouse. Complete with modern plumbing, a queen bed, wrap-around deck, and outdoor rain shower, it's the ultimate childhood dream refined.",
        "location": "Jungle canopy heights",
        "city": "Ubud",
        "country": "Indonesia",
        "price_per_night": Decimal("140.00"),
        "max_guests": 2,
        "bedrooms": 1,
        "bathrooms": 1,
        "property_type": "studio",
        "amenities": ["Jungle Canopy View", "Outdoor Shower", "Wifi", "Breakfast Included", "Eco Friendly"],
        "images": IMAGES[4]
    },
    {
        "title": "Historic Tuscan Hills Estate",
        "description": "A beautifully restored 16th-century stone farmhouse located in the heart of Tuscany's wine country. Features a private olive grove, brick arches, a large swimming pool, and an outdoor wood-fired pizza oven.",
        "location": "Via di Chianti 88",
        "city": "Siena",
        "country": "Italy",
        "price_per_night": Decimal("420.00"),
        "max_guests": 8,
        "bedrooms": 4,
        "bathrooms": 4,
        "property_type": "villa",
        "amenities": ["Private Pool", "Pizza Oven", "Vineyard View", "Wifi", "Air Conditioning", "Bicycles"],
        "images": IMAGES[5]
    },
    {
        "title": "Desert Glass Oasis Retreat",
        "description": "A modern glass and steel architectural marvel in the California desert. Offers views of rugged rock formations, stargazing decks, a private pool, and complete privacy under the desert sky.",
        "location": "Joshua Tree Highlands 5",
        "city": "Joshua Tree",
        "country": "United States",
        "price_per_night": Decimal("310.00"),
        "max_guests": 4,
        "bedrooms": 2,
        "bathrooms": 2,
        "property_type": "house",
        "amenities": ["Desert View", "Swimming Pool", "Hot Tub", "Stargazing Deck", "Fireplace", "Wifi"],
        "images": IMAGES[6]
    },
    {
        "title": "Luxury Rocky Mountain Lodge",
        "description": "Perfect for ski-in/ski-out winter adventures or scenic summer hikes. This grand lodge features vaulted wood ceilings, a massive stone fireplace, pool table, and room for the whole family.",
        "location": "Summit Ridge Rd 101",
        "city": "Aspen",
        "country": "United States",
        "price_per_night": Decimal("490.00"),
        "max_guests": 10,
        "bedrooms": 5,
        "bathrooms": 4,
        "property_type": "house",
        "amenities": ["Ski-in/Ski-out", "Hot Tub", "Game Room", "Wifi", "Fireplace", "Mountain Views"],
        "images": IMAGES[7]
    },
    {
        "title": "Nordic Fjord-Side Cabin",
        "description": "Wake up to breathtaking views of the Norwegian fjords. This cozy cottage is situated right at the water's edge, featuring a private dock, complimentary kayak, and a traditional wood sauna.",
        "location": "Fjordvegen 412",
        "city": "Flåm",
        "country": "Norway",
        "price_per_night": Decimal("190.00"),
        "max_guests": 4,
        "bedrooms": 2,
        "bathrooms": 1,
        "property_type": "house",
        "amenities": ["Fjord View", "Private Dock", "Kayak", "Sauna", "Wifi", "Kitchen"],
        "images": IMAGES[8]
    },
    {
        "title": "English Country Rose Cottage",
        "description": "A fairytale thatched-roof cottage in the heart of the Cotswolds. Walk along cobblestone pathways, enjoy tea in the beautiful private rose garden, and warm up by the historic stone hearth.",
        "location": "Rosebud Cottage Path",
        "city": "Cotswolds",
        "country": "United Kingdom",
        "price_per_night": Decimal("160.00"),
        "max_guests": 3,
        "bedrooms": 2,
        "bathrooms": 1,
        "property_type": "house",
        "amenities": ["Garden", "Fireplace", "Wifi", "Bath Tub", "Historical Details", "Kitchen"],
        "images": IMAGES[9]
    }
]

async def seed():
    settings = get_settings()
    engine = create_async_engine(settings.database_url, pool_pre_ping=True)
    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with AsyncSessionLocal() as session:
        # 1. Ensure a Host user exists
        stmt = select(User).where(User.role.in_(["host", "admin"]))
        result = await session.execute(stmt)
        host = result.scalars().first()
        
        if not host:
            # Create a default host user if none exists
            password_hash = bcrypt.hashpw("password".encode(), bcrypt.gensalt(rounds=12)).decode()
            host = User(
                name="Default Host",
                email="host@rentlora.com",
                password_hash=password_hash,
                role="host"
            )
            session.add(host)
            await session.commit()
            await session.refresh(host)
            print(f"Created default host user with email 'host@rentlora.com' and password 'password' (ID: {host.id})")
        else:
            print(f"Using existing host user (ID: {host.id}, Email: {host.email})")

        # 2. Add properties
        for p_data in PROPERTIES:
            # Check if property already exists
            stmt = select(Property).where(Property.title == p_data["title"])
            res = await session.execute(stmt)
            existing = res.scalars().first()
            if existing:
                print(f"Skipping: '{p_data['title']}' already exists.")
                continue
            
            prop = Property(
                host_id=host.id,
                **p_data
            )
            session.add(prop)
            print(f"Adding property: '{p_data['title']}'")
        
        await session.commit()
        print("Database seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
