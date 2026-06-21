# Rentlora CI/CD Pipeline — full reference

How the pipelines work across the three repos: every workflow, every job, how they
depend on each other, why we use a build matrix, and how the monorepo only builds what
changed.

---

## 1. Repos & responsibilities

| Repo | Has CI? | Role |
|---|---|---|
| [`rentlora`](https://github.com/rentlora/rentlora) | `ci.yml`, `build.yml`, `deploy.yml` (+ 3 composite actions) | App code — 5 FastAPI services + React frontend. Builds/ships images. |
| [`rentlora-infra`](https://github.com/rentlora/rentlora-infra) | `terraform-apply.yml` | Terraform — VPC, EKS, RDS, SQS, ECR, IRSA, ACM, ArgoCD/kgateway/Karpenter. |
| [`rentlora-helm`](https://github.com/rentlora/rentlora-helm) | **none** — ArgoCD watches it | Helm charts + ArgoCD ApplicationSet. **Source of truth for what's deployed.** |

**GitOps model:** CI never `kubectl apply`s. It builds an image and **writes the new tag
into `rentlora-helm`**; ArgoCD (running in-cluster) notices the git change and syncs the
cluster to match. The repo is the desired state; ArgoCD is the reconciler.

---

## 2. File inventory & how they call each other

```
rentlora/.github/
├── workflows/
│   ├── ci.yml        ← runs on pull_request   (gate: verify, never deploy)
│   ├── build.yml     ← runs on push to main   (release: build → bump dev → deploy)
│   └── deploy.yml    ← reusable + manual       (verify a rollout; promote to prod)
└── actions/                     (composite actions = reusable step bundles)
    ├── python-checks/           ruff + pytest          ← used by ci.yml & build.yml
    ├── build-scan-push/         docker build + Trivy + (optional) push  ← ci.yml & build.yml
    └── notify/                  Slack message (no-op if no webhook)     ← build.yml & deploy.yml

rentlora-infra/.github/workflows/
└── terraform-apply.yml          ← PR: validate/scan/plan · main: apply cluster→dev→prod
```

**Call graph (who uses what):**
- `ci.yml` → `python-checks`, `build-scan-push`
- `build.yml` → `python-checks`, `build-scan-push`, `notify`, **calls `deploy.yml`** (`workflow_call`)
- `deploy.yml` → `notify`

Composite actions exist so the *same* build/test logic isn't copy-pasted between the PR
gate and the release pipeline — fix it once, both inherit it.

---

## 3. End-to-end flow

```
 feature/* ──PR──▶ ci.yml (gate)
                      │ merge (after green + review)
                      ▼
              rentlora/main ──build.yml──▶ build changed svc → ECR → bump dev tag(s)
                                                       │
                                                       ▼  ArgoCD auto-sync
                                                  DEV (rentlora-dev ns, dev.rentlora.in)
                                                       │
                              deploy.yml (manual, target=production, approval gate)
                                                       ▼
                                                  PROD (production ns, rentlora.in)
```

---

## 4. `ci.yml` — the PR gate (verify only, blocks merge)

Trigger: `pull_request` to `main`. Nothing is pushed or deployed here.

### Job graph
```
changes ──┬──▶ lint-test   (only changed BACKENDS)
          ├──▶ image-scan  (only changed services)
          │
sonarcloud (always) ───────┐
snyk (changed svc deps) ────┤
                            ▼
                       ci-complete   (single required status check)
```

| Job | What it does | Why |
|---|---|---|
| **changes** | `dorny/paths-filter` maps changed files → service list. Outputs `services` (all changed) + `backends` (changed Python services). | The monorepo brain — everything below builds only what changed. |
| **lint-test** | `ruff` + `pytest` per changed backend (composite `python-checks`). | Catch lint/test failures before merge. Skipped entirely if no backend changed. |
| **image-scan** | `docker build` + Trivy scan (SARIF → Security tab), **no push**. | Prove the image builds and is free of CRITICAL vulns before merge. |
| **sonarcloud** | SAST over the whole repo. | Code-quality/security gate — runs every PR (whole-codebase concern). |
| **snyk** | SCA — scans **changed** services' deps (frontend npm / backend pip in a venv). | Catch vulnerable dependencies (this is what caught the react-router Open Redirect). |
| **ci-complete** | `if: always()`, aggregates all the above; fails if any **failed/cancelled**. | Branch protection requires ONE check, not 11 matrix legs. **Skipped jobs count as pass**, so a frontend-only PR is green without backend jobs. |

> Why an aggregator? Branch protection can require a single context name (`ci-complete`).
> Without it you'd have to list every matrix leg — which changes whenever services change.

---

## 5. `build.yml` — release on merge to main → DEV (automatic)

Trigger: `push` to `main` (and manual `workflow_dispatch` = rebuild all).

### Job graph
```
changes ──▶ build (matrix: changed services) ──▶ bump-dev ──▶ deploy-dev (calls deploy.yml)
```

| Job | Steps | Why |
|---|---|---|
| **changes** | same paths-filter as ci.yml | Build only changed services. |
| **build** | OIDC → ECR login → (`python-checks` if backend) → `build-scan-push` (build, Trivy gate, **push** tag=git SHA) | Ship images. Matrix = changed services (parallel). |
| **bump-dev** | checkout `rentlora-helm` (PAT) → `yq` bump **only changed** services in `environments/dev/values.yaml` `imageTags` → commit + push | Hands the new tag to GitOps. |
| **deploy-dev** | `uses: ./deploy.yml` with `target=dev`, `services=<changed>` | Verify ArgoCD actually rolled out the changed services. |

➡️ **Dev is continuous: merge to `main` → only changed services rebuild → ArgoCD ships them.**

---

## 6. `deploy.yml` — reusable verify / prod promotion

Two entry points: `workflow_call` (from build.yml, dev) and `workflow_dispatch` (manual, prod).

**Inputs:** `target` (dev|production), `image-tag`, `services` (JSON list to verify).

**Steps:**
1. Resolve env config (namespace, host, values dir).
2. **Bump only for prod** (`target == production`): set `environments/prod/values.yaml`
   global `imageTag` to the promoted SHA. (Dev was already bumped per-service by `bump-dev`.)
3. OIDC → `aws eks update-kubeconfig`.
4. Wait until each `services` Deployment references the tag (ArgoCD lag), then
   `kubectl rollout status`.
5. Smoke test (`curl https://<host>/healthz`, `/api/properties`).
6. `notify` success/failure to Slack.

**Prod gate:** `environment: production` → GitHub requires a reviewer to approve before the
job runs. Nothing reaches prod without a human approving the exact tested tag.

---

## 7. Composite actions (the reusable bricks)

| Action | Inputs | Does |
|---|---|---|
| **python-checks** | `context` | setup-python 3.11 → `pip install` → `ruff check` → `pytest -q` |
| **build-scan-push** | `service`, `context`, `registry`, `image-tag`, `push` | `docker build` → Trivy SARIF (report HIGH+CRITICAL) → Trivy gate (**fail on CRITICAL**) → push if `push=true` |
| **notify** | `status`, `title`, `webhook-url`, `details` | POST to Slack; **no-op if webhook empty** (so it's safe without the secret) |

---

## 8. `terraform-apply.yml` — the infra pipeline

Trigger: `pull_request` (verify) and `push` to `main` (apply).

### Job graph
```
PR:    validate (matrix: cluster/dev/prod) ─┬─▶ plan (matrix, PR comment)
       scan (Trivy IaC → SARIF + gate) ─────┘
main:  apply-cluster ──▶ apply-dev ──▶ apply-prod
        (env: cluster)    (env: dev)    (env: production)
```

| Job | Does | Why |
|---|---|---|
| **validate** | `terraform fmt -check` + `init` + `validate` per stack | Catch syntax/format errors. |
| **scan** | Trivy **config** scan (IaC misconfig) → SARIF + gate | Security-scan the Terraform itself. |
| **plan** | `terraform plan` → posted as a PR comment | Human reviews the diff before merge. |
| **apply-cluster/dev/prod** | `terraform apply` per stack, **each gated by its GitHub Environment** | Ordered apply with approval gates; prod needs a reviewer. |

---

## 9. `rentlora-helm` — the GitOps target (no CI)

No workflows. ArgoCD's ApplicationSet (`argocd/app-of-apps.yaml`) generates one Application
per service per env, each rendering its chart with the env's `values.yaml`. When `build.yml`
bumps a tag here, ArgoCD detects the commit and rolls the Deployment. Charts resolve the
image tag as `imageTags[service]` with a **fallback to `global.imageTag`** — so dev uses
per-service tags and prod (no map) uses one coordinated tag.

---

## 10. Monorepo strategy — why matrix + path-filter + per-service tags

This is the core of "doing a monorepo well."

### Why a **matrix**
One job definition, run in **parallel** for N services. Without it you'd copy-paste the
same build steps 6× (or loop serially and wait 6× as long). The matrix is generated
*dynamically* from the `changes` job, so its legs are exactly the services that changed.

### Why **path filters** (`dorny/paths-filter`)
A push that touches only `frontend/**` shouldn't rebuild + rescan 6 services. The `changes`
job diffs the commit/PR and emits the changed-service list; the matrix is built from it.
Result: a one-service change runs **one** build instead of six (~1–2 min vs ~6).

### Why **per-service image tags**
With a single shared `global.imageTag`, "deploy only frontend" is impossible — bumping the
global tag points *every* service at a SHA that was only built for one of them. So dev uses
an `imageTags` map (bumped per service). Charts fall back to `global.imageTag`, so prod can
still do a single coordinated release.

### The combined effect
```
change frontend only ──▶ changes=[frontend] ──▶ build frontend ──▶ bump imageTags.frontend
                                                                  ──▶ ArgoCD rolls only frontend
```
Fast feedback, minimal blast radius, no wasted CI minutes.

### Known trade-off (and the production answer)
Path-filtered SCA/scan means a **newly-disclosed** vuln in an *unchanged* service's deps
isn't caught until that service next changes. Production teams pair the path-filtered PR
gate with a **scheduled full scan** (nightly `snyk monitor` / Trivy) to catch drift. (Backlog.)

---

## 11. Dev vs Prod at a glance

| | **DEV** | **PROD** |
|---|---|---|
| App deploy trigger | Automatic on merge to `main` | Manual `deploy.yml` (`target=production`) |
| Gate | none | `production` Environment — **required reviewer** |
| Namespace | `rentlora-dev` | `production` |
| Helm values | `environments/dev/values.yaml` (per-service `imageTags`) | `environments/prod/values.yaml` (single `global.imageTag`) |
| Hostname | `dev.rentlora.in` | `rentlora.in` |
| Infra apply | env `dev` (after `cluster`) | env `production` approval (after `dev`) |
| Intent | fast iteration | promote only a dev-proven tag |

---

## 12. Identity, secrets & gates

- **No static AWS keys.** Workflows assume `rentlora-eks-ci` via **GitHub OIDC**
  (org-wide trust `repo:rentlora/*:*`). `AWS_CI_ROLE_ARN` is just the role's address.
- **Secrets:** `AWS_CI_ROLE_ARN`, `HELM_REPO_TOKEN` (cross-repo bump), `SONAR_TOKEN`,
  `SNYK_TOKEN`, `SLACK_WEBHOOK_URL` (optional).
- **App secrets at runtime:** pods read DB creds / config from **Secrets Manager + SSM via
  IRSA** — no Kubernetes Secrets, no `.env` in prod.
- **Branch protection on `main`** (both repos): PR required, status check required
  (`ci-complete` / infra checks), 1 review, CODEOWNERS, linear history. Admin bypass is
  currently on (set during bootstrap; tighten `enforce_admins` later).
