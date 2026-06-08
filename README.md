# Rentlora

Rentlora is a small rental marketplace monorepo with a React frontend, two FastAPI backend services, PostgreSQL, and Terraform infrastructure.

## Structure

```text
rentlora/
|-- frontend/
|-- booking-service/
|-- property-service/
|-- infra/
|   `-- terraform/
|-- docker-compose.yml
`-- ...
```

## Services

- `frontend`: Vite + React app served by Nginx in containers.
- `property-service`: property catalog, search, reviews, image upload, and AI listing description generation.
- `booking-service`: auth, user profile, and booking flows.
- `postgres`: shared database for local development.

## API layout

- Property service routes live under `/api/properties`, `/api/search`, `/api/reviews`, and `/api/ai`.
- Booking service routes live under `/api/auth`, `/api/users`, and `/api/bookings`.
- Health checks stay at `/health` on each backend service.

## AI feature

Hosts and admins can generate a draft property description from the Add Property page.

Required environment variables:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` optional, defaults to `gpt-5-mini`

The backend uses the OpenAI Responses API through the official Python SDK.

## Local development

### Option 1: Docker Compose

```bash
docker-compose up --build
```

The frontend container proxies directly to `property-service` and `booking-service`, and the backend services create the shared tables automatically on startup for local development.

App URLs:

- Frontend: `http://localhost`
- Property service: `http://localhost:8001/health`
- Booking service: `http://localhost:8002/health`

For the AI description feature locally, export `OPENAI_API_KEY` in your shell before starting Compose.

## Terraform

Terraform now lives in `infra/terraform`.

Before running Terraform:

1. Copy `infra/terraform/terraform.tfvars.example` to `infra/terraform/terraform.tfvars`.
2. Set strong values for `db_password` and `jwt_secret`.
3. Review the remaining hardcoded environment-specific values in `infra/terraform/main.tf`, such as AMI ID and key pair name.

Common commands:

```bash
cd infra/terraform
terraform init
terraform plan
terraform apply
```

## Repo hygiene notes

- Service virtualenvs are ignored through `.gitignore`.
- Terraform state and provider artifacts remain ignored.
- Local helper/bootstrap files that are no longer needed were removed during cleanup.
