# Branch Protection Rules

Rules applied to **`main`** in all three repos: `rentlora`, `rentlora-infra`, `rentlora-helm`.
Goal: nothing reaches `main` without going through a reviewed PR whose checks are **all green**.

## 🚦 Merge is BLOCKED until everything passes

A pull request cannot be merged until **all required status checks succeed** and the PR is approved.
If any scan/test fails, the merge button stays disabled.

| Repo | Required check (the gate) | What must pass inside it |
|------|---------------------------|--------------------------|
| `rentlora` | **`ci-complete`** | `ruff` (lint), `pytest` (tests), **SonarCloud** (SAST), **Snyk** (SCA), **Trivy** (image scan) |
| `rentlora-infra` | **`iac-checks`** | `terraform fmt` + `validate`, `terraform plan`, **Trivy** (IaC scan) |
| `rentlora-helm` | *(none — ArgoCD-watched)* | PR + review only (no build to gate) |

## Rules in effect

| Rule | Setting | Effect |
|------|---------|--------|
| Require pull request | ✅ on | No direct pushes to `main` |
| Require status checks | ✅ on (strict) | All checks above must pass **and** the branch must be up to date with `main` |
| Require approvals | ✅ 1 | At least one approving review |
| Require CODEOWNERS review | ✅ on | The owner (`@iyas311`) must approve |
| Dismiss stale approvals | ✅ on | A new push invalidates prior approvals |
| Linear history | ✅ on | Squash/rebase only — no merge commits |
| Force pushes | 🚫 off | `main` cannot be force-pushed |
| Deletions | 🚫 off | `main` cannot be deleted |
| **Enforce on admins** | ⚠️ **OFF (for now)** | **Admins can bypass these rules.** To be tightened later. |

> **Note:** `Enforce on admins` is intentionally **off** right now so the owner can push/merge
> directly if needed during setup. Flip it on later to make the rules apply to everyone with no exceptions:
> ```bash
> gh api -X PATCH repos/rentlora/<repo>/branches/main/protection/enforce_admins
> ```

## Normal workflow under these rules

```
git switch -c feature/my-change
# ...commit...
git push -u origin feature/my-change
gh pr create --base main
#   → checks run → fix until green → request review → approve → merge
```
