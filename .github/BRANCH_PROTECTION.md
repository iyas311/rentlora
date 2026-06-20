# Branch protection — trunk-based

`main` is the trunk. All work lands via short-lived `feature/*` branches → PR → `main`.
PRs must pass `ci.yml` (the `ci-complete` gate) and a review before merging. Merging to
`main` triggers `build.yml` (build/push images, bump dev, auto-deploy dev). Production is a
manual promotion via `deploy.yml` (target=production, GitHub Environment approval).

## Required GitHub setup (one-time)

**Repository secrets** (Settings → Secrets and variables → Actions):
- `AWS_CI_ROLE_ARN` — arn of the `rentlora-eks-ci` role (OIDC; not a static credential)
- `HELM_REPO_TOKEN` — PAT with write access to `rentlora/rentlora-helm`
- `SONAR_TOKEN` — SonarCloud token
- `SNYK_TOKEN` — Snyk token
- `SLACK_WEBHOOK_URL` — optional; failure/success notifications

**Environments** (Settings → Environments):
- `dev` — no protection (auto deploy)
- `production` — add required reviewers (this is the prod approval gate)

**Branch protection on `main`** — apply via the GitHub UI or `gh` (requires `gh auth login`):

```bash
gh api -X PUT repos/rentlora/rentlora/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  -f 'required_status_checks[strict]=true' \
  -f 'required_status_checks[contexts][]=ci-complete' \
  -f 'enforce_admins=true' \
  -f 'required_pull_request_reviews[required_approving_review_count]=1' \
  -f 'required_pull_request_reviews[dismiss_stale_reviews]=true' \
  -f 'required_pull_request_reviews[require_code_owner_reviews]=true' \
  -f 'required_linear_history=true' \
  -f 'allow_force_pushes=false' \
  -f 'allow_deletions=false' \
  -F 'restrictions=null'
```
