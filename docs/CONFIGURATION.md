# Configuration & Secrets Guide

This document explains **exactly what you need to create in AWS** and **how
configuration flows into the services** when running on Amazon EKS. It covers
every Secrets Manager secret, every Parameter Store parameter, the IAM
permissions each service needs, and the (minimal) Kubernetes wiring.

---

## 1. How configuration is resolved

Each service resolves its config at startup inside `config.py` → `fetch_aws_config()`:

```
Pod starts
  │
  ├─ Reads ENV and AWS_DEFAULT_REGION   ← the ONLY two env vars (from a ConfigMap)
  │
  ├─ If ENV is "dev" or "prod":
  │     ├─ Secrets Manager  → db password, jwt secret      (sensitive)
  │     └─ Parameter Store  → db host/user/name, queue URLs, model IDs, …  (non-sensitive)
  │     using the pod's IRSA role (no static AWS keys)
  │
  └─ If ENV is unset/"local":
        └─ Skip AWS, use built-in fallback defaults  (local development)
```

Every AWS lookup has a **fallback default**, so a missing parameter never
crashes a service — it just uses the default.

---

## 2. Do I still need Kubernetes Secrets and ConfigMaps?

Short answer: **you do NOT need K8s Secret objects, and you only need a tiny ConfigMap.**

Because the application reads Secrets Manager and Parameter Store **directly**
(via boto3 + IRSA), the secret values never need to be copied into a Kubernetes
`Secret`. This is the recommended pattern here:

| Kubernetes object | Needed? | What it holds |
|---|---|---|
| `ConfigMap` | ✅ Yes (minimal) | Only `ENV` and `AWS_DEFAULT_REGION` |
| `ServiceAccount` (IRSA-annotated) | ✅ Yes | The IAM role the pod assumes to reach AWS |
| `Secret` (app credentials) | ❌ No | Not used — secrets are fetched from Secrets Manager at runtime |

**Why this is better than stuffing secrets into K8s Secrets:**
- Secrets rotate in Secrets Manager with **no redeploy** and no stale copies.
- Nothing sensitive is ever stored in the cluster, in YAML, or in Git.
- One identity (IRSA) governs access — easy to audit and scope per service.

> **Alternative (only if you specifically want a synced K8s Secret):** the
> [AWS Secrets Store CSI Driver](https://github.com/aws/secrets-store-csi-driver-provider-aws)
> can mount a Secrets Manager secret into the pod as a real K8s `Secret`/volume.
> This project does **not** use it, because the services already fetch directly.
> Don't mix both — pick one. We recommend the direct-fetch pattern above.

---

## 3. The only variables you set in Kubernetes

Per environment, in a single `ConfigMap` shared by all services:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rentlora-config
  namespace: production
data:
  ENV: "prod"                 # "dev" or "prod" — this triggers AWS config fetch
  AWS_DEFAULT_REGION: "us-east-1"
```

That's it. No other environment variables are required. Everything else is
pulled from AWS at startup.

---

## 4. What to create in AWS Secrets Manager

Create these **once per environment** (`dev`, `prod`). These are the only
sensitive values.

| Secret name | Used by | Description |
|---|---|---|
| `/rentlora/{env}/db-password` | property, booking, admin, ai-search | PostgreSQL password |
| `/rentlora/{env}/jwt-secret` | property, booking, admin, ai-service | Shared JWT signing secret |

```bash
ENV=dev   # repeat with ENV=prod

aws secretsmanager create-secret \
  --name "/rentlora/$ENV/db-password" \
  --secret-string "REPLACE_WITH_REAL_DB_PASSWORD"

aws secretsmanager create-secret \
  --name "/rentlora/$ENV/jwt-secret" \
  --secret-string "REPLACE_WITH_REAL_JWT_SECRET"
```

---

## 5. What to create in AWS Systems Manager Parameter Store

Non-sensitive configuration. Items marked **required** have no usable fallback
in dev/prod; the rest fall back to the listed default if absent.

| Parameter name | Used by | Required? | Fallback default |
|---|---|---|---|
| `/rentlora/{env}/db-endpoint` | property, booking, admin, ai-search | **required** | — |
| `/rentlora/{env}/db-user` | property, booking, admin, ai-search | optional | `postgres` |
| `/rentlora/{env}/db-name` | property, booking, admin, ai-search | optional | `rentlora` |
| `/rentlora/{env}/s3-image-bucket` | property | **required** | — |
| `/rentlora/{env}/cloudfront-domain` | property | optional | `""` |
| `/rentlora/{env}/internal-alb-dns` | property | optional | `http://ai-service:8003` |
| `/rentlora/{env}/property-sync-queue-url` | property (producer), ai-search (consumer) | optional* | `""` (HTTP fallback) |
| `/rentlora/{env}/booking-events-queue-url` | booking | optional | `""` (log only) |
| `/rentlora/{env}/bedrock-nova-model-id` | ai-service, ai-search | optional | `amazon.nova-lite-v1:0` |
| `/rentlora/{env}/bedrock-embedding-model-id` | ai-service, ai-search | optional | `amazon.titan-embed-text-v2:0` |
| `/rentlora/{env}/ai-search-service-url` | ai-service | optional | `http://ai-search-service:8005` |
| `/rentlora/{env}/booking-service-url` | ai-service | optional | `http://booking-service:8002` |
| `/rentlora/{env}/ses-sender-email` | booking | optional | `no-reply@rentlora.com` |

\* If `property-sync-queue-url` is empty, the event-driven embedding path is
disabled and property-service falls back to a direct HTTP embedding call. Set it
to enable the SQS flow.

```bash
ENV=dev   # repeat with ENV=prod

aws ssm put-parameter --type String --name "/rentlora/$ENV/db-endpoint"               --value "rentlora-$ENV.xxxx.us-east-1.rds.amazonaws.com:5432"
aws ssm put-parameter --type String --name "/rentlora/$ENV/db-user"                   --value "postgres"
aws ssm put-parameter --type String --name "/rentlora/$ENV/db-name"                   --value "rentlora"
aws ssm put-parameter --type String --name "/rentlora/$ENV/s3-image-bucket"           --value "rentlora-$ENV-property-images"
aws ssm put-parameter --type String --name "/rentlora/$ENV/property-sync-queue-url"    --value "https://sqs.us-east-1.amazonaws.com/ACCOUNT/rentlora-$ENV-property-sync"
aws ssm put-parameter --type String --name "/rentlora/$ENV/booking-events-queue-url"   --value "https://sqs.us-east-1.amazonaws.com/ACCOUNT/rentlora-$ENV-booking-events.fifo"
aws ssm put-parameter --type String --name "/rentlora/$ENV/ses-sender-email"           --value "no-reply@yourdomain.com"
# bedrock model ids and internal service URLs only need a parameter if you want
# to override the defaults above.
```

> When the infrastructure is created with Terraform (`rentlora-infra`), these
> parameters can be written automatically as outputs of the SQS / S3 / RDS
> modules, so you won't create them by hand — this list is the contract those
> modules fulfil.

---

## 6. Per-service summary

What each service reads, and the IAM permissions its IRSA role needs.

| Service | Secrets Manager | Parameter Store | Extra AWS actions (IAM) |
|---|---|---|---|
| **property-service** | db-password, jwt-secret | db-*, s3-image-bucket, cloudfront-domain, internal-alb-dns, property-sync-queue-url | `s3:PutObject/GetObject` (image bucket), `sqs:SendMessage`, `sqs:GetQueueAttributes` (property-sync) |
| **ai-search-service** | db-password | db-*, property-sync-queue-url, bedrock-* | `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:GetQueueAttributes` (property-sync), `bedrock:InvokeModel` |
| **booking-service** | db-password, jwt-secret | db-*, booking-events-queue-url, ses-sender-email | `sqs:SendMessage` (booking-events), `ses:SendEmail`, `sns:Publish` |
| **ai-service** | jwt-secret | bedrock-*, ai-search-service-url, booking-service-url | `bedrock:InvokeModel` |
| **admin-service** | db-password, jwt-secret | db-* | — |

Every role additionally needs:
`secretsmanager:GetSecretValue` on its `/rentlora/{env}/*` secrets and
`ssm:GetParameter*` on its `/rentlora/{env}/*` parameters.

---

## 7. Kubernetes wiring (per service)

Three objects per service. Example for `property-service`:

```yaml
# ServiceAccount — the IRSA link to the IAM role (created by Terraform)
apiVersion: v1
kind: ServiceAccount
metadata:
  name: property-service
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::<ACCOUNT_ID>:role/rentlora-prod-property-service
---
# Deployment — uses the ServiceAccount and the shared ConfigMap
apiVersion: apps/v1
kind: Deployment
metadata:
  name: property-service
  namespace: production
spec:
  replicas: 2
  template:
    spec:
      serviceAccountName: property-service        # <-- grants AWS access via IRSA
      containers:
        - name: property-service
          image: <ECR>/rentlora-prod-property-service:<tag>
          envFrom:
            - configMapRef:
                name: rentlora-config              # <-- injects ENV + AWS_DEFAULT_REGION
          # No `env` secrets and no `secretKeyRef` — the app fetches them itself.
```

The flow: `rentlora-config` ConfigMap sets `ENV=prod` → the app calls AWS →
IRSA (via `serviceAccountName`) authorizes the calls → values are loaded.

---

## 8. Local development

For `docker-compose` / local runs, **do nothing in AWS**:

- Leave `ENV` unset (or `ENV=local`). `fetch_aws_config()` returns early and the
  built-in fallback defaults apply.
- A `.env` file is **optional** and only for local overrides. It is **not used in
  production** — `env_file=".env"` is a harmless no-op when the file is absent.

---

## 9. Setup checklist

1. Create the two **secrets** per environment (Section 4).
2. Create the **required parameters** (`db-endpoint`, `s3-image-bucket`) and any
   queue URLs you want active (Section 5). Override defaults only if needed.
3. Ensure each service's **IAM role** (IRSA) has the permissions in Section 6
   (Terraform handles this in `rentlora-infra`).
4. Apply the **ConfigMap** with `ENV` + `AWS_DEFAULT_REGION` (Section 3).
5. Apply each service's **ServiceAccount** (IRSA-annotated) and **Deployment**
   (Section 7).
6. Verify: `GET /api/properties/cloud-health` returns `{"irsa": "ok", ...}`,
   confirming the pod reached AWS with no static credentials.
