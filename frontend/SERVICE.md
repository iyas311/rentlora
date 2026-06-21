# frontend

The React single-page app (Vite build) served by **nginx-unprivileged**. The user-facing tier.

## What it does
- React SPA — browse/search properties, view details, book, host dashboard, admin dashboard
- Talks to the backend through the gateway under `/api/*`
- Uploads property images **directly to S3** via the presigned flow (no bytes through nginx)
- Served on `/` for everything not matched by an `/api/...` route

## AWS resources & why

| Resource | Used for | Why / benefit |
|---|---|---|
| **(none at runtime)** | — | It's static assets served by nginx. No AWS SDK, no IRSA role, no secrets. |
| **ECR** (build-time) | stores the built image | Pulled by the Deployment. |
| **CloudFront + S3** (indirect) | renders property images | `<img src>` points at the CloudFront domain; images come from the private S3 bucket. |
| **NLB + ACM** (indirect) | TLS entry point | The gateway's NLB terminates TLS; nginx receives plain HTTP. |

## Runtime shape
- Image: `nginxinc/nginx-unprivileged` → runs as **UID 101** (`runAsUser: 101`), listens on **8080**.
- No `/healthz` route (static nginx) → the chart uses a **TCP** readiness/liveness probe on 8080.

## Improvements
- **Put CloudFront in front of the SPA too** — cache the static bundle at the edge (today nginx
  serves it from the pod on every request); big latency + cost win for global users.
- **Cache-busting + long-TTL** on hashed assets; `index.html` no-cache.
- **Code splitting / lazy routes** to shrink first paint.
- **Lazy-load images** + use the `thumbnail`/`medium` CDN variants on listing cards (not originals).
- A tighter **Content-Security-Policy** + security headers in the nginx config.

## Unnecessary / cleanup
- Nothing over-provisioned. The main "waste" is serving static assets from a pod instead of a CDN
  — see the CloudFront-for-SPA improvement above.
