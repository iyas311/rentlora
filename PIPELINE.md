# Rentlora CI/CD Pipeline

How the pipelines behave across the three repos, and how **dev** vs **prod** differ.

## Repos & responsibilities

| Repo | Pipeline | Role |
|------|----------|------|
| [`rentlora`](https://github.com/rentlora/rentlora) | `ci.yml`, `build.yml`, `deploy.yml` | App code (5 FastAPI services + frontend). Builds/ships images. |
| [`rentlora-infra`](https://github.com/rentlora/rentlora-infra) | `terraform-apply.yml` | Terraform: VPC, EKS, RDS, SQS, ECR, IRSA, ACM, ArgoCD/kgateway/Karpenter. |
| [`rentlora-helm`](https://github.com/rentlora/rentlora-helm) | *(none — ArgoCD watches it)* | Helm charts + ArgoCD ApplicationSet. Source of truth for what's deployed. |

GitOps model: **CI builds an image and writes its tag into `rentlora-helm`; ArgoCD (in-cluster) syncs the cluster to match.** No workflow pushes directly to Kubernetes.

---

## End-to-end flow

```
 feature/* ──PR──▶ rentlora/main ──build.yml──▶ ECR + bump dev tag ──▶ ArgoCD ──▶ DEV
                                                                                   │
                                                       deploy.yml (manual + approval)
                                                                                   ▼
                                                              bump prod tag ──▶ ArgoCD ──▶ PROD
```

---

## App pipeline (`rentlora`)

### 1. On every Pull Request → `ci.yml`  *(verify only — no deploy)*
Same checks regardless of target environment. Blocks merge until green:
- `ruff` (lint) + `pytest` (tests), per service
- **SonarCloud** (SAST) · **Snyk** (SCA) · **Trivy** (image scan, no push)
- All roll up into the **`ci-complete`** gate.

### 2. On merge to `main` → `build.yml`  → **DEV (automatic)**
1. Build all 6 images, tag = **git SHA**, Trivy gate, push to **ECR**.
2. Commit the new tag into `rentlora-helm` → `environments/dev/values.yaml`.
3. **ArgoCD auto-syncs** the `rentlora-dev` namespace.
4. `deploy.yml` (target=dev) waits for the rollout, runs `kubectl rollout status` + smoke tests.

➡️ **Dev is continuous: every merge to `main` ships to dev with no human step.**

### 3. Promote to **PROD (manual + approval)** → `deploy.yml`
1. Run `deploy.yml` manually (`workflow_dispatch`), `target=production`, with a tag already proven in dev.
2. The **`production` GitHub Environment requires reviewer approval** — the job pauses here.
3. On approval: bump `environments/prod/values.yaml` → **ArgoCD syncs** the `production` namespace → verify + smoke.

➡️ **Prod is promote-on-approval: nothing reaches prod without a human approving the exact tested tag.**

---

## Infra pipeline (`rentlora-infra` → `terraform-apply.yml`)

### On Pull Request *(verify only)*
- `terraform fmt -check` + `validate` (cluster/dev/prod stacks)
- `terraform plan` — posted as a PR comment for review
- **Trivy IaC** config scan
- All roll up into the **`iac-checks`** gate.

### On merge to `main` *(apply)*
Applies stacks in order, **each gated by its GitHub Environment approval**:
```
apply cluster ──▶ apply dev ──▶ apply prod
  (env: cluster)   (env: dev)    (env: production)
```

---

## Dev vs Prod at a glance

| | **DEV** | **PROD** |
|---|---|---|
| App deploy trigger | Automatic on merge to `main` | Manual `deploy.yml` (`target=production`) |
| Gate | none | `production` Environment — **required reviewer** |
| App namespace | `rentlora-dev` | `production` |
| Helm values bumped | `environments/dev/values.yaml` | `environments/prod/values.yaml` |
| Infra apply | auto after `cluster` (env: `dev`) | after `dev`, **env: `production`** approval |
| Hostname | `dev.rentlora.in` | `rentlora.in` |
| Intent | fast iteration | promote only a dev-proven tag |

## Identity & secrets
- **No static AWS keys.** Workflows assume the `rentlora-eks-ci` role via **GitHub OIDC** (trust is org-wide: `repo:rentlora/*:*`).
- Repo secrets: `AWS_CI_ROLE_ARN`, `HELM_REPO_TOKEN`, `SONAR_TOKEN`, `SNYK_TOKEN`, `SLACK_WEBHOOK_URL` (optional).
- App pods read DB creds / config from **Secrets Manager + SSM** via IRSA — no Kubernetes Secrets.
