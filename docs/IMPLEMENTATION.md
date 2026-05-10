# Memory Stream & Search Implementation Guide

This guide covers the Memory Stream Retrieval and Search functionality built for Continuum MVP.

## Overview

Two main features have been implemented:

1. **Memory Stream Retrieval** — Chronological feed of memories with automatic date grouping
2. **Search** — Keyword + semantic + hybrid search using pgvector and OpenAI embeddings

## Architecture

### Backend

```
/api/memories [GET]
  └─ Fetches memories grouped by date
  └─ Supports pagination (limit, offset)
  └─ Returns user-specific results (RLS via JWT)

/api/search [POST]
  ├─ Keyword search (PostgreSQL ILIKE)
  ├─ Semantic search (pgvector cosine similarity)
  └─ Hybrid search (combines both, deduplicated)
```

### Database

```sql
memories
  ├─ id (uuid)
  ├─ user_id (uuid) — FK to users
  ├─ text (text)
  ├─ half_baked (boolean)
  ├─ metadata (jsonb)
  └─ created_at (timestamptz)

memory_embeddings
  ├─ id (uuid)
  ├─ memory_id (uuid) — FK to memories
  ├─ embedding (vector(1536))
  └─ created_at (timestamptz)

Indexes:
  ├─ idx_memories_user_id
  ├─ idx_memories_user_created_at (DESC)
  ├─ idx_memory_embeddings_memory_id
  └─ idx_memory_embeddings_vector_cosine (IVFFlat)

RPC Function:
  └─ search_memories_by_embedding()
     ├─ Input: query_embedding, user_id, threshold, limit
     └─ Returns: id, text, half_baked, metadata, created_at, similarity
```

### Frontend

```
components/
  ├─ Stream.tsx
  │  ├─ Displays grouped memories by date
  │  ├─ Implements infinite scroll
  │  └─ Uses useMemories() hook
  ├─ Search.tsx
  │  ├─ Search form with type selector
  │  ├─ Similarity badges for semantic results
  │  └─ Uses useSearchMemories() hook
  └─ Input.tsx (existing, already saves to /api/input)

lib/
  └─ useMemories.ts
     ├─ useMemories() hook — fetch paginated memories
     └─ useSearchMemories() hook — search with keyword/semantic/hybrid
```

## Setup Instructions

### 1. Deploy Database Schema

Run the updated `db/schema.sql` in Supabase SQL editor:

```bash
# In Supabase dashboard → SQL Editor → paste contents of db/schema.sql
```

This will:
- Create the RPC function `search_memories_by_embedding()`
- Add performance indexes
- Ensure pgvector extension is enabled

### 2. Environment Variables

Add to `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI (for embeddings & semantic search)
OPENAI_API_KEY=sk-your-api-key

# Local development (optional)
LOCAL_USER_ID=550e8400-e29b-41d4-a716-446655440000
```

### 3. Integrate Components

In your main layout or page (`app/page.tsx`):

```tsx
import Stream from '@/components/Stream'
import Search from '@/components/Search'
import Input from '@/components/Input'

export default function Home() {
  return (
    <main className="flex flex-col gap-8 p-8">
      {/* Input form */}
      <Input />
      
      {/* Search component */}
      <Search />
      
      {/* Memory stream */}
      <Stream />
    </main>
  )
}
```

## API Reference

### GET /api/memories

Fetch memories with chronological ordering and date grouping.

**Query Parameters:**
- `limit` (number): Items per page (default: 20, max: 100)
- `offset` (number): Pagination offset (default: 0)
- `groupBy` (string): "date" | "none" (default: "date")

**Response (with groupBy=date):**
```json
{
  "ok": true,
  "data": {
    "2025-05-10": [
      {
        "id": "uuid",
        "text": "string",
        "half_baked": false,
        "metadata": {},
        "created_at": "2025-05-10T14:30:00Z"
      }
    ],
    "2025-05-09": [...]
  },
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

**Example:**
```bash
curl http://localhost:3000/api/memories?limit=20&offset=0 \
  -H "Authorization: Bearer <token>"
```

### POST /api/search

Search memories using keyword, semantic, or hybrid methods.

**Body:**
```json
{
  "query": "string (required)",
  "type": "keyword|semantic|hybrid (default: hybrid)",
  "limit": 20,
  "threshold": 0.5
}
```

**Response:**
```json
{
  "ok": true,
  "query": "What am I working on?",
  "type": "hybrid",
  "results": [
    {
      "id": "uuid",
      "text": "Building semantic search...",
      "half_baked": false,
      "metadata": {},
      "created_at": "2025-05-10T10:00:00Z",
      "similarity": 0.89
    }
  ],
  "count": 3
}
```

**Examples:**

Keyword search:
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "embeddings",
    "type": "keyword",
    "limit": 10
  }'
```

Semantic search:
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What have I been working on lately?",
    "type": "semantic",
    "threshold": 0.5,
    "limit": 10
  }'
```

Hybrid search (recommended):
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "task extraction",
    "type": "hybrid",
    "limit": 20
  }'
```

## Search Types Explained

### Keyword Search
- **What:** Case-insensitive text matching (PostgreSQL ILIKE)
- **Speed:** Fast (full-text indexed)
- **Best for:** Exact phrase matching, brand/name lookups
- **Example:** "Find memories about 'OpenAI'"

### Semantic Search
- **What:** Cosine similarity in embedding space
- **Speed:** Moderate (IVFFlat index on vectors)
- **Best for:** Meaning-based queries, conceptual search
- **Example:** "What have I been thinking about AI?" → finds related concepts
- **Cost:** OpenAI API call per query

### Hybrid Search
- **What:** Combines keyword + semantic results, deduplicated
- **Speed:** Moderate (both indices queried)
- **Best for:** General-purpose search, maximum recall
- **Deduplication:** Same memory appearing in both results shown once, ranked by similarity score

## Performance Considerations

### Indexes
The IVFFlat index on `memory_embeddings.embedding` makes semantic search efficient:
- Lists: 100 (tuned for ~1000+ memories)
- Distance metric: cosine similarity
- Expected latency: <100ms for 10k memories

### Cost Optimization
- **Embeddings**: Called only on input capture and search queries
- **API calls per search**: 1 OpenAI call (text-embedding-3-small) per semantic/hybrid search
- **Database queries**: 1-2 queries per API call

### Scaling
For >100k memories:
- Consider batch embedding generation
- Increase IVFFlat lists to 300-500
- Monitor Supabase pgvector query performance

## Hooks API

### useMemories()

```tsx
const { memories, loading, error, total, hasMore, fetchMemories, loadMore } = useMemories()

// Load first page
await fetchMemories(0, 20, 'date')

// Load next page
await loadMore(20, 'date')
```

**Returns:**
- `memories`: `Record<string, Memory[]>` — grouped by date
- `loading`: boolean
- `error`: string | null
- `total`: number — total memories (all pages)
- `hasMore`: boolean — more pages available
- `fetchMemories(offset, limit, groupBy)`: Function
- `loadMore(limit, groupBy)`: Function

### useSearchMemories()

```tsx
const { results, loading, error, search, clearResults } = useSearchMemories()

// Perform search
await search('What am I building?', 'hybrid', 20, 0.5)

// Clear results
clearResults()
```

**Returns:**
- `results`: `SearchResult[]` — includes similarity scores for semantic/hybrid
- `loading`: boolean
- `error`: string | null
- `search(query, type, limit, threshold)`: Function
- `clearResults()`: Function

## Common Patterns

### Infinite Scroll Feed
```tsx
// Stream.tsx uses Intersection Observer for auto-load
useEffect(() => {
  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && hasMore && !loading) {
      loadMore(20, 'date')
    }
  })
  if (scrollEndRef.current) observer.observe(scrollEndRef.current)
}, [hasMore, loading, loadMore])
```

### Search with Debounce
```tsx
const [query, setQuery] = useState('')
const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

const handleQueryChange = (q: string) => {
  setQuery(q)
  clearTimeout(searchTimeout!)
  const timeout = setTimeout(() => search(q, 'hybrid'), 300)
  setSearchTimeout(timeout)
}
```

### Relevance-Based Sorting
Semantic/hybrid search already returns results sorted by similarity score (highest first).

## Troubleshooting

### "Unauthorized" errors
- Check `Authorization: Bearer <token>` header is set
- For local dev, use `x-user-id: <uuid>` header or `LOCAL_USER_ID` env var

### Semantic search returns empty
- Verify `OPENAI_API_KEY` is set
- Check Supabase function `search_memories_by_embedding` exists (run schema.sql)
- Ensure `memory_embeddings` table has records for memories

### Slow searches
- Check IVFFlat index exists: `SELECT * FROM pg_indexes WHERE tablename='memory_embeddings'`
- Monitor pgvector query plan: `EXPLAIN ANALYZE SELECT ... FROM memory_embeddings`

### High API costs
- Semantic search incurs 1 OpenAI call (~$0.00002) per search
- Consider caching common queries
- Use keyword search for frequent queries

## Next Steps

1. ✅ Memory Stream Retrieval (DONE)
2. ✅ Search with pgvector (DONE)
3. 🔜 Conversational reflection over memory history (/api/converse)
4. 🔜 Task extraction and Tasks tab
5. 🔜 Memory graph visualization
6. 🔜 Proactive reminders

---

For more details, see:
- [API Documentation](./API.md)
- [Database Schema](../db/schema.sql)
- [Component Examples](../components/)
