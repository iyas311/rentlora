# Rentlora

> A cloud-native rental marketplace built on Amazon EKS — microservices, event-driven, AI-powered.

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-336791?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-EKS-FF9900?logo=amazonaws&logoColor=white)

---

## Overview

Rentlora is a full-stack rental marketplace (think Airbnb) composed of **five FastAPI microservices** and a **React + Vite frontend**. The platform runs on Amazon EKS and leverages AWS-native services for storage, messaging, email, and AI. Services communicate asynchronously via SQS and expose a consistent REST API behind a kgateway (Envoy) edge router.

---

## Repository Map

The platform spans three repositories that sit side by side:

| Repository | Purpose |
|---|---|
| **`rentlora`** (this repo) | Application source — React frontend + 5 FastAPI services, Docker Compose, CI workflows |
| [`rentlora-infra`](../rentlora-infra) | Terraform — VPC, EKS, RDS, SQS, S3, ECR, IRSA, Route53, ACM |
| [`rentlora-helm`](../rentlora-helm) | Helm charts for all workloads; reconciled by Argo CD (GitOps) |

---

## Architecture

```
Browser (HTTPS)
      │
      ▼
Route53 → NLB (ACM TLS) → kgateway (Envoy)
                                 │
              ┌──────────────────┼─────────────────────────────┐
              │                  │                             │
         /* frontend       /api/properties            /api/bookings  ...
          (Nginx:8080)    property-service:8001       booking-service:8002
                          property-service:8001       ai-service:8003
                                                      admin-service:8004
                                                      ai-search-service:8005
                                                      user-service:8006
```

### Services

```
rentlora/
├── frontend/                  # React 18 + Vite + Tailwind CSS, served by Nginx
└── backend/
    ├── property-service/      # Listing catalog, reviews, image upload (S3 presigned)
    ├── booking-service/       # Bookings, email (SES), notifications (SNS), booking events (SQS)
    ├── ai-service/            # AI descriptions, RAG, agent chat (Amazon Bedrock)
    ├── admin-service/         # Platform stats, user/role management
    ├── ai-search-service/     # Vector semantic search (pgvector + Bedrock Titan Embeddings)
    └── user-service/          # Authentication, JWT issuance, user accounts
```

### API Layout

| Service | Base Path | Port |
|---|---|---|
| Property | `/api/properties`, `/api/search`, `/api/reviews` | 8001 |
| Booking | `/api/bookings` | 8002 |
| AI | `/api/ai` | 8003 |
| Admin | `/api/admin` | 8004 |
| AI Search | `/api/search/ai` | 8005 |
| User (Auth) | `/api/auth`, `/api/users` | 8006 |
| Health | `/health`, `/healthz`, `/ready` | all services |

---

## AI Features

Powered by **Amazon Bedrock** — no self-hosted models, no GPU management.

| Model | Used For |
|---|---|
| **Amazon Nova Lite** | Property description generation, RAG summaries, agent chat with tool-calling |
| **Amazon Titan Text Embeddings V2** | 1024-dimension vectors stored in pgvector for semantic property search |

Model IDs are SSM parameters — swap models without a code change.

---

## Event-Driven Architecture (SQS)

Services communicate asynchronously instead of synchronous HTTP calls:

```
property-service   ──[property-sync queue]──▶  ai-search-service   (re-embeds on change)
booking-service    ──[booking-events queue]──▶  downstream consumers (audit, analytics)
```

Both flows degrade gracefully — if no queue URL is configured (local dev), services fall back to their direct behavior.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS 3, React Query, React Hook Form, Zod |
| Backend | Python 3.12, FastAPI 0.115, SQLAlchemy 2 (async), Alembic, Pydantic v2 |
| Database | PostgreSQL (RDS) with pgvector extension for vector search |
| Messaging | Amazon SQS |
| Storage | Amazon S3 (presigned URL upload), CloudFront CDN |
| AI | Amazon Bedrock (Nova Lite + Titan Embeddings V2) |
| Email / SMS | Amazon SES, Amazon SNS |
| Auth | JWT (HS256), bcrypt password hashing |
| Container | Docker, multi-stage builds, non-root user |
| Orchestration | Amazon EKS, Helm, Argo CD (GitOps), Karpenter |
| IaC | Terraform |
| CI | GitHub Actions (lint → test → Trivy scan → ECR push → Helm tag bump) |

---

## Configuration

Configuration is resolved at startup based on the `ENV` variable — no static credentials anywhere.

- **Secrets** (DB password, JWT secret) → **AWS Secrets Manager**
- **Non-sensitive config** (DB host, S3 bucket, SQS URLs, Bedrock model IDs, etc.) → **AWS SSM Parameter Store**
- **AWS credentials in-cluster** → **IRSA** (each pod assumes a scoped IAM role via its ServiceAccount — zero K8s Secret objects needed)

### Key Parameters

| SSM Path | Description |
|---|---|
| `/rentlora/{env}/db-endpoint` | RDS endpoint |
| `/rentlora/{env}/db-password` | DB password (Secrets Manager) |
| `/rentlora/{env}/jwt-secret` | JWT signing secret (Secrets Manager) |
| `/rentlora/{env}/s3-image-bucket` | S3 bucket for listing images |
| `/rentlora/{env}/property-sync-queue-url` | SQS queue — property change events |
| `/rentlora/{env}/booking-events-queue-url` | SQS queue — booking lifecycle events |
| `/rentlora/{env}/bedrock-nova-model-id` | Amazon Nova Lite model ID |
| `/rentlora/{env}/bedrock-embedding-model-id` | Titan Embeddings V2 model ID |
| `/rentlora/{env}/ses-sender-email` | SES verified sender address |

See [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) for the complete reference.

---

## Local Development

### Prerequisites

- Docker + Docker Compose
- (Optional) AWS credentials for AI/SQS/SES features

### Start

```bash
git clone <repo-url>
cd rentlora

docker-compose up --build
```

All services start together. Each backend service creates its database tables automatically on first boot. With `ENV=local`, AWS lookups are skipped and fallback defaults apply — no AWS account required for basic functionality.

### Service URLs

| Service | URL |
|---|---|
| Frontend | http://localhost |
| Property | http://localhost:8001/health |
| Booking | http://localhost:8002/health |
| AI | http://localhost:8003/health |
| Admin | http://localhost:8004/health |
| AI Search | http://localhost:8005/health |
| User / Auth | http://localhost:8006/health |

---

## Deployment

The production target is **Amazon EKS** with a GitOps delivery model:

1. **Terraform** (`rentlora-infra`) provisions all AWS infrastructure — VPC, EKS cluster, RDS, SQS queues, S3 + CloudFront, ECR repositories, IRSA roles, Route53 zone, and ACM certificate.
2. **GitHub Actions** (`build.yml`) lints, tests, scans images with Trivy, pushes to ECR, and bumps the image tag in `rentlora-helm`.
3. **Argo CD** watches `rentlora-helm` and automatically syncs Helm chart changes to the cluster — zero-touch deployments on every merged PR.

### Container Images

All images are multi-stage builds running as a non-root user (`UID 1000`). Images are scanned for vulnerabilities by Trivy before being pushed to ECR.

---

## CI / CD Pipeline

```
git push to main
      │
      ▼
GitHub Actions — build.yml
  ├── ruff check (lint)
  ├── pytest (smoke tests)
  ├── docker build (changed services only)
  ├── trivy image scan
  ├── docker push → ECR
  └── git commit → rentlora-helm (bump image tag)
                          │
                          ▼
                    Argo CD detects tag change
                          │
                          ▼
                    kubectl rollout (verified by deploy.yml)
```

---

## Security

- No AWS access keys in code, environment variables, or Kubernetes Secrets — all AWS access via IRSA
- Secrets fetched from AWS Secrets Manager at pod startup
- Containers run as non-root (`runAsUser: 1000`, `allowPrivilegeEscalation: false`)
- Images scanned for CVEs by Trivy in CI before every push
- SonarCloud static analysis on every PR (`sonar-project.properties`)
- Network policies restrict inter-service traffic

---

## Project Status

| Component | Status |
|---|---|
| Backend microservices | Production-ready |
| React frontend | Production-ready |
| Terraform infra | Production-ready |
| Helm charts + Argo CD | Production-ready |
| AI / Bedrock integration | Production-ready |
| SQS event flows | Production-ready |
