# RAG Admin API (development / hackathon)

This document lists the lightweight RAG admin endpoints used to seed and
manage the retrieval corpus during development and demos.

Base path: `/api/rag`

Endpoints
- `POST /api/rag/seed` — seed vector documents
  - Body: JSON array of documents: `[ { "id": "doc1", "text": "...", "metadata": { ... } } ]`
  - Returns: `{ "seeded": N }`

- `GET /api/rag/examples` — list indexed vector example ids with metadata
  - Returns: `[ { "id": "doc1", "metadata": { ... } }, ... ]`

- `POST /api/rag/story/{story_id}/index` — index an existing story (creates RAG record)
  - Path param: `story_id` (string)
  - Returns: `{ "indexed": "<story_id>" }`

- `POST /api/rag/story/{story_id}/reject` — apply parent feedback / mark rejected
  - Body: `StoryFeedbackRequest` (see backend/models/schemas.py)
  - Returns: `{ "story_id": "<id>", "rejected": true/false }`

Notes
- These routes are intentionally lightweight for hackathon/demo use. In
  production you should restrict them to admin users and add auditing,
  validation, and rate-limiting.
- The vector index uses `backend/app/integrations/vector_store.py` and stores
  documents under the Redis-backed key `vector:<doc_id>`.
- Config keys added: `midjourney_api_key`, `midjourney_base_url` (optional image provider).
