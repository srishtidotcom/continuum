# Continuum — API & Integration Notes (MVP)

Overview
- Minimal server API layer to accept captures, index embeddings, search, and provide conversational reflection.

Authentication
- Use Supabase Auth for signups (email, Google OAuth)
- Pass JWT token in `Authorization: Bearer <token>` header
- Fallback: `x-user-id` header for local development

## Endpoints

### 1) POST /api/input
- **Purpose**: Accept a raw capture from the client (text, halfBaked flag, optional metadata)
- **Body**: 
  ```json
  {
    "text": "string (required)",
    "halfBaked": "boolean (default: false)",
    "metadata": "object (default: {})"
  }
  ```
- **Actions**:
  - Persist to `memories` table
  - Create embedding (text-embedding-3-small) and store in `memory_embeddings`
  - Run lightweight task extraction routine (heuristic: detect "todo", "to do", "remind me")
  - Return: `{ ok: true, id: "uuid" }`
- **Example**:
  ```bash
  curl -X POST http://localhost:3000/api/input \
    -H "Authorization: Bearer <token>" \
    -H "Content-Type: application/json" \
    -d '{
      "text": "Try building with embeddings for better search",
      "halfBaked": true,
      "metadata": { "source": "twitter" }
    }'
  ```

### 2) GET /api/memories
- **Purpose**: Fetch memories with chronological ordering and automatic date grouping
- **Query Parameters**:
  - `limit`: number of memories per page (default: 20, max: 100)
  - `offset`: pagination offset (default: 0)
  - `groupBy`: "date" (default) | "none" — whether to group by date in response
- **Return**:
  ```json
  {
    "ok": true,
    "data": {
      "2025-05-10": [
        {
          "id": "uuid",
          "text": "string",
          "half_baked": "boolean",
          "metadata": "object",
          "created_at": "ISO timestamp"
        }
      ],
      "2025-05-09": [...]
    },
    "total": "number",
    "limit": "number",
    "offset": "number"
  }
  ```
- **Example**:
  ```bash
  # Fetch first 20 memories, grouped by date
  curl http://localhost:3000/api/memories?limit=20&offset=0&groupBy=date \
    -H "Authorization: Bearer <token>"
  
  # Fetch as flat list without date grouping
  curl http://localhost:3000/api/memories?limit=20&groupBy=none \
    -H "Authorization: Bearer <token>"
  ```

### 3) POST /api/search
- **Purpose**: Keyword + semantic search with optional hybrid results
- **Body**:
  ```json
  {
    "query": "string (required)",
    "type": "keyword" | "semantic" | "hybrid" (default: "hybrid"),
    "limit": "number (default: 20, max: 100)",
    "threshold": "number (default: 0.5, cosine similarity threshold for semantic)"
  }
  ```
- **Actions**:
  - **Keyword**: ILIKE text search (case-insensitive)
  - **Semantic**: Generate query embedding, run pgvector cosine similarity search
  - **Hybrid**: Combine results, deduplicate by memory ID, return merged list ranked by semantic similarity
- **Return**:
  ```json
  {
    "ok": true,
    "query": "string",
    "type": "keyword" | "semantic" | "hybrid",
    "results": [
      {
        "id": "uuid",
        "text": "string",
        "half_baked": "boolean",
        "metadata": "object",
        "created_at": "ISO timestamp",
        "similarity": "number (only for semantic/hybrid, 0-1)"
      }
    ],
    "count": "number"
  }
  ```
- **Examples**:
  ```bash
  # Keyword search
  curl -X POST http://localhost:3000/api/search \
    -H "Authorization: Bearer <token>" \
    -H "Content-Type: application/json" \
    -d '{
      "query": "embeddings",
      "type": "keyword"
    }'
  
  # Semantic search (requires OpenAI API key)
  curl -X POST http://localhost:3000/api/search \
    -H "Authorization: Bearer <token>" \
    -H "Content-Type: application/json" \
    -d '{
      "query": "What have I been thinking about AI?",
      "type": "semantic",
      "threshold": 0.5,
      "limit": 10
    }'
  
  # Hybrid search (keyword + semantic, deduplicated)
  curl -X POST http://localhost:3000/api/search \
    -H "Authorization: Bearer <token>" \
    -H "Content-Type: application/json" \
    -d '{
      "query": "task extraction",
      "type": "hybrid",
      "limit": 20
    }'
  ```

### 4) POST /api/converse (Future)
- **Purpose**: Conversational reflection over user's memory history
- **Body**: `{ prompt: string, context_ids?: string[] }`
- **Actions**: retrieve top-N related memories, build prompt template, call LLM, return assistant reply

### 5) GET /api/tasks (Future)
- **Purpose**: Return extracted tasks for the user

## Implementation Notes

- **Embeddings**: Use `text-embedding-3-small` (1536 dimensions). Stored in pgvector.
- **Vector Search**: Uses pgvector cosine similarity (`<=>` operator). IVFFlat index for performance.
- **Keyword Search**: PostgreSQL ILIKE for case-insensitive matching.
- **RPC Function**: `search_memories_by_embedding()` — defined in `db/schema.sql`, handles user isolation and similarity filtering.
- **Cost Optimization**: OpenAI embedding API called on capture and search. Cache results where possible.
- **User Isolation**: All queries filtered by `user_id` from JWT token.

## Database Schema

See `db/schema.sql` for:
- `users` — Managed by Supabase Auth
- `memories` — Raw captures with optional half-baked flag
- `memory_embeddings` — pgvector embeddings (1536-dim)
- `tasks` — Extracted actionable items
- Indexes on user_id, created_at, and embedding vector (IVFFlat)
- RPC function `search_memories_by_embedding()` for semantic search

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Supabase anon key (client-side)
SUPABASE_URL                      # (Server-side, defaults to NEXT_PUBLIC_SUPABASE_URL)
SUPABASE_SERVICE_ROLE_KEY         # Supabase service role key (server-side DB access)
OPENAI_API_KEY                    # For embeddings & future LLM calls
LOCAL_USER_ID                     # (Dev only) Fallback user ID for testing without auth
```

Security
- Enforce per-user isolation on all queries; use RLS policies in production with Supabase.

Next steps
- Wire up `POST /api/input` to call OpenAI embeddings and persist vector rows.
- Add background job or edge function to run heavier processing (task extraction, link metadata).
