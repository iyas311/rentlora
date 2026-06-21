# ai-service

**Stateless** AI gateway — wraps Amazon Bedrock for generation/embedding/chat. No database.

## What it does
- `POST /api/ai/description` — generate a listing description (Amazon **Nova Lite**)
- `POST /api/ai/embed` — text → vector embedding (Amazon **Titan Embed v2**)
- `POST /api/ai/rag` — retrieval-augmented answer
- `POST /api/ai/chat` — conversational endpoint
- Liveness/readiness: `/healthz`, `/ready`

## AWS resources & why

| Resource | Used for | Why / benefit |
|---|---|---|
| **Bedrock** (`bedrock:InvokeModel`) | Nova Lite (text gen) + Titan Embed v2 (vectors) | Managed foundation models — no GPUs/model hosting to run; pay per call. |
| **SSM Parameter Store** | model IDs (`bedrock-nova-model-id`, `bedrock-embedding-model-id`) | Swap models without a redeploy — change the SSM value, restart. |

**No RDS, no Secrets Manager** (beyond the shared config read). That's deliberate — this
service holds no state, so it scales horizontally trivially and restarts cleanly.

## Why stateless matters here
Bedrock calls are CPU-light but latency-bound. A stateless service can scale out under load
(HPA on CPU/concurrency) and back down to near-zero with no data-consistency concerns.

## Improvements
- **Response caching** for `description` (same property inputs → same output) to cut Bedrock cost/latency.
- **Streaming** responses for `chat` (Bedrock supports streaming) — better UX.
- **Guardrails** (Bedrock Guardrails) for prompt-injection / unsafe output filtering.
- **Prompt versioning** — keep prompts in SSM/config so they're tunable without a deploy.
- **Bedrock model-access** must be enabled in the console per account (not Terraform) — easy to miss.

## Unnecessary / overlap
- The **`/embed` endpoint overlaps with ai-search-service**, which also embeds via Titan. Decide
  on one owner of embeddings (likely ai-search-service for indexing; ai-service for ad-hoc) to
  avoid two code paths drifting.
