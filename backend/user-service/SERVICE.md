# user-service

Owns **authentication and user accounts** — extracted from booking-service so auth is a
clear, independent boundary. Issues the JWTs that every other service validates.

## What it does
- **Auth (JWT)** — `POST /api/auth/register|login|refresh|logout`
- **Users** — `GET/PUT /api/users/me`
- Sends a **welcome email** on registration
- Owns the `users` table (shared DB; other services read it / validate JWTs locally)
- Liveness/readiness: `/healthz`, `/ready` (port **8006**)

## AWS resources & why

| Resource | Used for | Why / benefit |
|---|---|---|
| **RDS (PostgreSQL)** | `users` table | Source of truth for accounts; create_all on startup. |
| **Secrets Manager** | DB password **+ JWT signing secret** | Both sensitive; read via IRSA, never in code. This service *issues* tokens, so it holds the JWT secret. |
| **SES** (`ses:SendEmail`) | welcome email on register | Registration is a user concern, so the email lives here. |
| **SSM Parameter Store** | db endpoint/user/name, SES sender | Per-env non-sensitive config. |

## Why it's a separate service
Auth was previously bundled in booking-service. Splitting it:
- Makes the auth/token boundary explicit — every service validates JWTs locally with the
  shared secret; only user-service *issues* them.
- Lets auth scale and deploy independently of bookings.
- Shrinks booking-service to its actual job (reservations).

No data migration was needed — all services share one Postgres DB, so this moved the
auth/user **endpoints** (and `users` table ownership), not the data.

## Improvements
- **Rate-limit** login/register (brute-force protection) at the gateway or in-app.
- **Refresh-token rotation / revocation** for stronger session security.
- **SES production access** (sandbox only sends to verified addresses by default).
- Consider **JWKS / key rotation** instead of a single shared HS256 secret.

## Cleanup notes
- Carries a few unused Booking Pydantic schemas inherited from the split; harmless, can be trimmed.
