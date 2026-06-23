# Branch protection — trunk-based

`main` is the trunk. All work lands via short-lived `feature/*` branches → PR → `main`.

PRs must pass both `ci-backend-complete` and `ci-frontend-complete` plus a review before
merging. If only backend changed, `ci-frontend-complete` passes immediately (nothing ran =
no failures). Same in reverse. Merging to `main` triggers `build.yml` (build+push only
changed services, bump dev imageTags). Production is promoted by publishing a GitHub Release
(`release.yml` snapshots dev, requires reviewer approval via GitHub Environment gate).

## Pipeline overview

| Workflow | Trigger | What it does |
|---|---|---|
| `ci-backend.yml` | PR to main | compile → SAST → Snyk → image+Trivy (sequential, backend only) |
| `ci-frontend.yml` | PR to main | build-check → Snyk → image+Trivy (sequential) |
| `build.yml` | push to main / manual | build+push changed services → bump dev imageTags |
| `release.yml` | GitHub Release published | snapshot dev → approval gate → write prod imageTags |

## Required GitHub setup (one-time)

**Repository secrets** (Settings → Secrets and variables → Actions):
- `AWS_CI_ROLE_ARN` — arn of the `rentlora-eks-ci` role (OIDC; not a static credential)
- `HELM_REPO_TOKEN` — PAT with write access to `rentlora/rentlora-helm`
- `SONAR_TOKEN` — SonarCloud token
- `SNYK_TOKEN` — Snyk token
- `SLACK_WEBHOOK_URL` — optional; failure/success notifications

**Environments** (Settings → Environments):
- `dev` — no protection (build.yml uses this implicitly; no gate needed)
- `production` — add required reviewers (the prod approval gate in release.yml)

**Branch protection on `main`** — two required checks now:

```bash
gh api -X PUT repos/rentlora/rentlora/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  -f 'required_status_checks[strict]=true' \
  -f 'required_status_checks[contexts][]=ci-backend-complete' \
  -f 'required_status_checks[contexts][]=ci-frontend-complete' \
  -f 'enforce_admins=true' \
  -f 'required_pull_request_reviews[required_approving_review_count]=1' \
  -f 'required_pull_request_reviews[dismiss_stale_reviews]=true' \
  -f 'required_pull_request_reviews[require_code_owner_reviews]=true' \
  -f 'required_linear_history=true' \
  -f 'allow_force_pushes=false' \
  -f 'allow_deletions=false' \
  -F 'restrictions=null'
```
