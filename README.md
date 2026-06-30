# Rentlora

> A cloud-native rental marketplace — React frontend and FastAPI microservices, deployed on Amazon EKS.

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-336791?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-EKS-FF9900?logo=amazonaws&logoColor=white)

---

## Overview

Rentlora is a full-stack rental marketplace platform. It consists of a **React + Vite frontend** and **six FastAPI backend services**, all backed by PostgreSQL and designed to run on Amazon EKS. Services communicate asynchronously via Amazon SQS and use AWS-native integrations for storage, email, and AI.

---

## Repository Structure

```
rentlora/
├── frontend/                   # React 18 + Vite + Tailwind CSS, served by Nginx
├── backend/
│   ├── property-service/       # Listing catalog, reviews, image upload (S3 presigned)
│   ├── booking-service/        # Bookings, email (SES), notifications (SNS), events (SQS)
│   ├── ai-service/             # AI descriptions, RAG, agent chat (Amazon Bedrock)
│   ├── admin-service/          # Platform stats and user/role management
│   ├── ai-search-service/      # Vector semantic search (pgvector + Bedrock Titan Embeddings)
│   └── user-service/           # Authentication, JWT issuance, user accounts
├── docs/                       # Configuration reference
├── docker-compose.yml          # Local development
└── sonar-project.properties    # SonarCloud static analysis config
```

### Companion Repositories

| Repository | Purpose |
|---|---|
| [`rentlora-infra`](../rentlora-infra) | Terraform — VPC, EKS, RDS, SQS, S3, ECR, IRSA, Route53, ACM |
| [`rentlora-helm`](../rentlora-helm) | Helm charts for all workloads, reconciled by Argo CD (GitOps) |

---

## Architecture

```
Browser (HTTPS)
      │
      ▼
Route53 → NLB (ACM TLS) → kgateway (Envoy)
                                  │
              ┌───────────────────┼────────────────────────────┐
              │                   │                            │
        /* frontend         /api/properties            /api/auth ...
         (Nginx:8080)      property-service:8001       user-service:8006
                           booking-service:8002
                           ai-service:8003
                           admin-service:8004
                           ai-search-service:8005
```

---

## Services

| Service | Port | Database | Key AWS Integrations |
|---|---|---|---|
| `property-service` | 8001 | PostgreSQL | S3, CloudFront, SQS, Secrets Manager, SSM |
| `booking-service` | 8002 | PostgreSQL | SQS, SES, SNS, Secrets Manager, SSM |
| `ai-service` | 8003 | — | Bedrock (Nova Lite + Titan Embeddings), SSM |
| `admin-service` | 8004 | PostgreSQL | Secrets Manager, SSM |
| `ai-search-service` | 8005 | PostgreSQL + pgvector | SQS, Bedrock (Titan Embeddings), Secrets Manager, SSM |
| `user-service` | 8006 | PostgreSQL | SES, Secrets Manager, SSM |

All backend services expose `/healthz` (liveness) and `/ready` (readiness) probes.

---

## Frontend

Built with **React 18 + Vite 5 + Tailwind CSS 3**.

| Page | Route |
|---|---|
| Home | `/` |
| Browse Listings | `/browse` |
| Property Detail | `/properties/:id` |
| Booking Confirm | `/bookings/confirm` |
| My Bookings | `/my-bookings` |
| Host Dashboard | `/host` |
| Add Property | `/host/add` |
| Admin Dashboard | `/admin` |
| Login / Register | `/login`, `/register` |
| Profile | `/profile` |

Key libraries: React Query, React Hook Form, Zod, React Router v6, Axios, date-fns.

---

## AI Features

Powered by **Amazon Bedrock** — no self-hosted models or GPU infrastructure.

| Model | Used For |
|---|---|
| **Amazon Nova Lite** | Property description generation, RAG summaries, conversational chat |
| **Amazon Titan Text Embeddings V2** | 1024-dimension vectors stored in pgvector for semantic property search |

Model IDs are SSM parameters — swap models without a code change.

---

## Event-Driven Flows (SQS)

```
property-service  ──[property-sync queue]──▶  ai-search-service   (re-embeds on change)
booking-service   ──[booking-events queue]──▶  downstream consumers (audit, analytics)
```

Both flows degrade gracefully — if no queue URL is configured, services fall back to direct behavior.

---

## Configuration

- **Secrets** (DB password, JWT secret) → AWS Secrets Manager
- **Non-sensitive config** (DB host, S3 bucket, SQS URLs, model IDs, SES sender) → AWS SSM Parameter Store
- **AWS credentials in-cluster** → IRSA (each pod assumes a scoped IAM role via its ServiceAccount — no K8s Secret objects, no static keys)

See [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) for the full parameter reference.

---

## Local Development

### Prerequisites

- Docker + Docker Compose

### Start

```bash
docker-compose up --build
```

All services start together. Each backend service creates its tables automatically on first boot. With `ENV=local`, AWS lookups are skipped and fallback defaults apply — no AWS account required for basic functionality.

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

The production target is **Amazon EKS** with a GitOps delivery model.

1. **Terraform** (`rentlora-infra`) provisions all AWS infrastructure.
2. **GitHub Actions** lints, tests, scans images with Trivy, pushes to ECR, and bumps the image tag in `rentlora-helm`.
3. **Argo CD** watches `rentlora-helm` and automatically syncs chart changes to the cluster.

### CI Pipeline

```
git push to main
      │
      ▼
GitHub Actions
  ├── ruff check (lint)
  ├── pytest (smoke tests)
  ├── docker build
  ├── trivy image scan
  ├── docker push → ECR
  └── bump image tag → rentlora-helm (triggers Argo CD rollout)
```

---

## Security

- No static AWS credentials anywhere — all pod access via IRSA
- Secrets fetched from Secrets Manager at startup
- Containers run as non-root (`runAsUser: 1000`, `allowPrivilegeEscalation: false`)
- Images scanned for CVEs by Trivy before every push
- SonarCloud static analysis on every PR
