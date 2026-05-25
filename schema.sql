CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20) DEFAULT 'guest' CHECK (role IN ('guest','host','admin')),
    phone         VARCHAR(20),
    avatar_url    VARCHAR(500),
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE properties (
    id              SERIAL PRIMARY KEY,
    host_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    location        VARCHAR(300),
    city            VARCHAR(100) NOT NULL,
    country         VARCHAR(100) DEFAULT 'India',
    price_per_night DECIMAL(10,2) NOT NULL,
    max_guests      INTEGER NOT NULL,
    bedrooms        INTEGER DEFAULT 1,
    bathrooms       INTEGER DEFAULT 1,
    property_type   VARCHAR(50) CHECK (property_type IN ('apartment','house','villa','studio')),
    amenities       JSONB DEFAULT '[]',
    images          JSONB DEFAULT '[]',
    is_available    BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bookings (
    id            SERIAL PRIMARY KEY,
    guest_id      INTEGER REFERENCES users(id),
    property_id   INTEGER REFERENCES properties(id),
    check_in      DATE NOT NULL,
    check_out     DATE NOT NULL,
    guests_count  INTEGER NOT NULL,
    total_nights  INTEGER NOT NULL,
    total_price   DECIMAL(10,2) NOT NULL,
    status        VARCHAR(20) DEFAULT 'confirmed'
                  CHECK (status IN ('confirmed','cancelled','completed')),
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reviews (
    id          SERIAL PRIMARY KEY,
    booking_id  INTEGER UNIQUE REFERENCES bookings(id),
    property_id INTEGER REFERENCES properties(id),
    reviewer_id INTEGER REFERENCES users(id),
    rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);
