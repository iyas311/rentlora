# Rentlora

Rentlora is a cloud-native rental marketplace built as a microservices application.
It consists of a React frontend and five FastAPI backend services backed by
PostgreSQL (with `pgvector` for semantic search), and is designed to run on
Kubernetes (Amazon EKS) with event-driven communication and AWS-native cloud
integrations.

## Repositories

The platform is split across three repositories that sit side by side:

| Repo | Purpose |
|------|---------|
| `rentlora` (this repo) | Application source for all services + base Kubernetes manifests + CI/build workflows |
| `rentlora-infra` | Terraform for all AWS infrastructure (VPC, EKS, RDS, SQS, ECR, IAM/IRSA) |
| `rentlora-helm` | Helm charts for every workload; reconciled to the cluster by Argo CD (GitOps) |

## Services

```text
rentlora/
|-- frontend/                 # Vite + React, served by Nginx
|-- backend/
|   |-- property-service/     # property catalog, search, reviews, image upload (S3)
|   |-- booking-service/      # auth/JWT, bookings, email (SES) + SMS (SNS), booking events (SQS)
|   |-- ai-service/           # AI descriptions, RAG, and agent chat (Amazon Bedrock)
|   |-- admin-service/        # admin operations
|   `-- ai-search-service/    # vector search + embedding consumer (Amazon Bedrock + SQS)
|-- kubernetes/               # base manifests (namespace, deployments, services, ingress)
`-- docker-compose.yml        # local development
```

### API layout

- Property service: `/api/properties`, `/api/search`, `/api/reviews`
- Booking service: `/api/auth`, `/api/users`, `/api/bookings`
- AI service: `/api/ai`
- Admin service: `/api/admin`
- AI search service: `/api/search/ai`
- Health checks: `/health`, plus `/healthz` (liveness) and `/ready` (readiness)

## AI features

AI capabilities are powered by **Amazon Bedrock**:

- **Amazon Nova Lite** — property description generation, RAG summaries, and an
  agent chat assistant with tool calling.
- **Amazon Titan Text Embeddings V2** — 1024-dimension vector embeddings used for
  semantic property search via `pgvector`.

Model IDs are configuration values (see below), not hardcoded, so they can be
swapped without code changes.

## Event-driven architecture (SQS)

Services communicate asynchronously through Amazon SQS instead of blocking
HTTP calls:

- **Property sync** — when a property is created or updated, `property-service`
  publishes a message to the `property-sync` queue. `ai-search-service` consumes
  it, generates a fresh embedding via Bedrock, and stores it. This decouples
  writes from embedding generation and removes duplicate work.
- **Booking events** — `booking-service` publishes `created` / `cancelled`
  events to the `booking-events` queue for downstream consumers (audit,
  analytics, notifications), while existing email/SMS notifications continue to
  work as before.

Both flows degrade gracefully: if no queue is configured (for example, local
development), the services fall back to their previous direct behavior.

## Configuration model

Configuration is resolved at startup based on the `ENV` variable:

- **Sensitive values** (database password, JWT secret) come from **AWS Secrets
  Manager**.
- **Non-sensitive values** (database host / user / name, region, S3 bucket, CDN
  domain, SQS queue URLs, Bedrock model IDs, internal service URLs, SES sender)
  come from **AWS Systems Manager Parameter Store**.
- Every lookup has a **fallback default**, so a missing parameter never crashes a
  service.

In the cluster, credentials are obtained through **IRSA (IAM Roles for Service
Accounts)** — each pod assumes a scoped IAM role via its ServiceAccount. There
are **no static AWS access keys** in code, environment variables, or Kubernetes
secrets. A `.env` file is therefore **not required in production**; it remains a
convenience for local development only.

> See **[docs/CONFIGURATION.md](docs/CONFIGURATION.md)** for the full list of
> secrets and parameters to create, the per-service IAM permissions, and the
> Kubernetes wiring (including why no K8s `Secret` objects are needed).

### Secrets (AWS Secrets Manager)

| Name | Description |
|------|-------------|
| `/rentlora/{env}/db-password` | PostgreSQL password |
| `/rentlora/{env}/jwt-secret` | Shared JWT signing secret |

### Parameters (AWS Systems Manager Parameter Store)

| Name | Fallback default |
|------|------------------|
| `/rentlora/{env}/db-endpoint` | — (required in dev/prod) |
| `/rentlora/{env}/db-user` | `postgres` |
| `/rentlora/{env}/db-name` | `rentlora` |
| `/rentlora/{env}/s3-image-bucket` | — (property-service) |
| `/rentlora/{env}/cloudfront-domain` | `""` |
| `/rentlora/{env}/internal-alb-dns` | `http://ai-service:8003` |
| `/rentlora/{env}/property-sync-queue-url` | `""` (HTTP fallback) |
| `/rentlora/{env}/booking-events-queue-url` | `""` (log only) |
| `/rentlora/{env}/bedrock-nova-model-id` | `amazon.nova-lite-v1:0` |
| `/rentlora/{env}/bedrock-embedding-model-id` | `amazon.titan-embed-text-v2:0` |
| `/rentlora/{env}/ai-search-service-url` | `http://ai-search-service:8005` |
| `/rentlora/{env}/booking-service-url` | `http://booking-service:8002` |
| `/rentlora/{env}/ses-sender-email` | `no-reply@rentlora.com` |

`ENV` and `AWS_DEFAULT_REGION` are provided by the Kubernetes ConfigMap.

## Local development

```bash
docker-compose up --build
```

The frontend container proxies to the backend services, and each backend creates
its tables automatically on startup. With `ENV=local`, AWS lookups are skipped
and the fallback defaults apply.

App URLs:

- Frontend: `http://localhost`
- Property service: `http://localhost:8001/health`
- Booking service: `http://localhost:8002/health`
- AI service: `http://localhost:8003/health`
- Admin service: `http://localhost:8004/health`
- AI search service: `http://localhost:8005/health`

## Deployment

The target runtime is **Amazon EKS**:

- **Terraform** (`rentlora-infra`) provisions the VPC, EKS cluster with managed
  node groups, RDS PostgreSQL, SQS queues, ECR repositories, CloudWatch log
  groups, and the IRSA roles — with remote state in S3 and DynamoDB locking.
- **Container images** are multi-stage Docker builds running as a non-root user,
  pushed to ECR by GitHub Actions with image vulnerability scanning.
- **Helm charts** (`rentlora-helm`) define each workload (Deployment with
  multiple replicas, Service, ServiceAccount, ConfigMap, HPA, NetworkPolicy) and
  are reconciled by **Argo CD**.
- **Ingress** is provisioned by the AWS Load Balancer Controller, routing
  external traffic to the frontend and `/api/*` paths to the backend services.

## Repo hygiene

- Service virtualenvs, Terraform state, and provider artifacts are ignored via
  `.gitignore`.
- No credentials are committed; all secrets and configuration live in AWS
  Secrets Manager and Parameter Store.
