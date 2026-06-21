# ai-search-service

**Semantic search** over properties, backed by pgvector — plus an event-driven pipeline that
keeps the embeddings fresh.

## What it does
- `POST /api/search/ai` — natural-language property search: embed the query (Titan) → nearest-
  neighbour search over property vectors (pgvector) → ranked results
- **SQS consumer** (background) — long-polls `property-sync`; for each event, fetches the property,
  generates a fresh embedding, and upserts it into the vector column
- Liveness/readiness: `/healthz`, `/ready`

## AWS resources & why

| Resource | Used for | Why / benefit |
|---|---|---|
| **RDS (PostgreSQL + pgvector)** | property embeddings + vector similarity search | One datastore for rows *and* vectors — no separate vector DB to operate. |
| **Bedrock** (`bedrock:InvokeModel`, Titan Embed v2) | text → vector | Managed embeddings; same model as indexing for consistent vector space. |
| **SQS — `property-sync` (ReceiveMessage/DeleteMessage)** | consume property-change events | Decoupled, durable indexing — if this service is down, events wait in the queue. |
| **Secrets Manager / SSM** | DB password / db config + model id | Per-env config via IRSA. |

## The pipeline it completes
```
property-service writes ──▶ property-sync (SQS) ──▶ ai-search consumer ──▶ embed (Titan) ──▶ pgvector
                                                                                              │
                              user query ──▶ embed ──▶ vector search ◀──────────────────────┘
```
This is the **read+index** side of search; property-service is the write side.

## Improvements
- **Dead-letter queue** on `property-sync` + retry/backoff so a poison message doesn't block the queue.
- **Batch embedding** (embed N properties per Bedrock call where supported) to cut cost on bulk re-index.
- **Hybrid search** — combine vector similarity with keyword/filter (price, location) for better relevance.
- **Vector index** (`ivfflat`/`hnsw`) on the embedding column for speed as the catalog grows.
- An **embedding cache** so unchanged property text isn't re-embedded on every event.

## Unnecessary / cleanup
- It reads a **`bedrock-nova-model-id`** param but only needs the **embedding** model — drop the
  unused Nova reference here (generation belongs to ai-service) to keep its IAM + config minimal.
