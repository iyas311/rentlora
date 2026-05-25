# Rentlora Monorepo

## Folder Structure

```text
rentlora/
├── frontend/
├── property-service/
└── booking-service/
```

## Architecture

```text
Browser
  -> Nginx (frontend, port 80)
     -> /api/properties,/api/search,/api/reviews -> property-service (FastAPI :8001)
     -> /api/auth,/api/users,/api/bookings       -> booking-service (FastAPI :8002)

property-service + booking-service
  -> Shared PostgreSQL 16 (AWS RDS / local container)
```

## Prerequisites

- Node.js 18+
- Python 3.11+
- Docker + Docker Compose

## Local Development

### Option 1: Docker Compose

```bash
docker-compose up --build
```

App URLs:
- Frontend: `http://localhost`
- Property Service: `http://localhost:8001`
- Booking Service: `http://localhost:8002`

### Option 2: Manual Start

1. Start Postgres and run [schema.sql](./schema.sql).
2. Booking service:
   - `cd booking-service`
   - `python -m venv .venv && .venv\Scripts\activate`
   - `pip install -r requirements.txt`
   - `uvicorn main:app --reload --port 8002`
3. Property service:
   - `cd property-service`
   - `python -m venv .venv && .venv\Scripts\activate`
   - `pip install -r requirements.txt`
   - `uvicorn main:app --reload --port 8001`
4. Frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## Production Deployment (EC2 via S3 + Launch Template)

1. Build each service artifact independently (`frontend`, `property-service`, `booking-service`).
2. Upload artifacts/images to S3.
3. Launch Template boot script pulls artifact from S3, injects env vars (`DATABASE_URL`, `JWT_SECRET`, `S3_BUCKET_NAME`, `INTERNAL_ALB_DNS`), and starts container/systemd service.
4. Internal ALB routes `/api/properties|search|reviews` to property-service and `/api/auth|users|bookings` to booking-service.
5. Frontend Nginx serves static build and proxies `/api/*` to internal ALB DNS.

## API Quick Reference

| Service | Method | Route | Description |
|---|---|---|---|
| property | GET | `/health` | Health check |
| property | GET | `/api/properties` | List/filter properties |
| property | GET | `/api/properties/{id}` | Property detail |
| property | POST | `/api/properties` | Create property (host/admin) |
| property | PUT | `/api/properties/{id}` | Update property |
| property | DELETE | `/api/properties/{id}` | Soft delete property |
| property | POST | `/api/properties/{id}/images` | Upload property images |
| property | GET | `/api/properties/{id}/availability` | Availability check |
| property | GET | `/api/search/cities` | Distinct city list |
| property | GET | `/api/search/suggestions` | Search suggestions |
| property | GET | `/api/reviews/property/{property_id}` | Property reviews |
| property | POST | `/api/reviews` | Create review |
| property | GET | `/api/reviews/my` | My reviews |
| property | DELETE | `/api/reviews/{id}` | Delete review |
| booking | GET | `/health` | Health check |
| booking | POST | `/api/auth/register` | Register |
| booking | POST | `/api/auth/login` | Login |
| booking | POST | `/api/auth/refresh` | Refresh access token |
| booking | POST | `/api/auth/logout` | Logout |
| booking | GET | `/api/users/me` | Current user |
| booking | PUT | `/api/users/me` | Update profile |
| booking | GET | `/api/users/{id}/public` | Public profile |
| booking | GET | `/api/bookings/my` | Guest bookings |
| booking | GET | `/api/bookings/{id}` | Booking detail |
| booking | POST | `/api/bookings` | Create booking |
| booking | PUT | `/api/bookings/{id}/cancel` | Cancel booking |
| booking | GET | `/api/bookings/host/mine` | Host-side bookings |
