# CRITICAL: Supabase Setup & Deployment Guide

## ⚠️ BLOCKING ISSUES - MUST FIX BEFORE PRODUCTION

### Issue #1: Missing RPC Function (BLOCKS Semantic Search & Chat)

Both `/api/search` (semantic) and `/api/chat` endpoints call a Supabase RPC function that **does not exist in your Supabase database**.

**Symptom:** Search and chat endpoints fail with:
```json
{
  "ok": false,
  "error": "Failed to retrieve memories"
}
```

**Fix:** Run the RPC function creation SQL in your Supabase console:

1. Go to: **Supabase Dashboard → Your Project → SQL Editor**
2. Click **New Query** and paste this SQL:

```sql
-- RPC function for semantic search using pgvector cosine similarity
CREATE OR REPLACE FUNCTION search_memories_by_embedding(
  query_embedding vector(1536),
  user_id_param uuid,
  similarity_threshold float DEFAULT 0.5,
  match_limit int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  text text,
  half_baked boolean,
  metadata jsonb,
  created_at timestamptz,
  similarity float
) AS $$
  SELECT
    m.id,
    m.text,
    m.half_baked,
    m.metadata,
    m.created_at,
    (1 - (me.embedding <=> query_embedding))::float AS similarity
  FROM memory_embeddings me
  JOIN memories m ON me.memory_id = m.id
  WHERE m.user_id = user_id_param
    AND (1 - (me.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT match_limit;
$$ LANGUAGE sql STABLE;
```

3. Click **Run** button
4. ✅ Verify success message appears

---

### Issue #2: Row-Level Security (RLS) Not Enforced (SECURITY RISK)

**Current state:** RLS policies exist in `db/rls.sql` but are NOT enabled on Supabase tables.

**Risk:** Any authenticated user can read/write all data (no per-user isolation)

**Fix:** Enable RLS on all tables via Supabase UI:

1. Go to **Supabase Dashboard → Your Project → Authentication → Policies**
2. For each table, click the table name:
   - `users`
   - `memories`
   - `memory_embeddings`
   - `tasks`

3. Click **Enable RLS** button for each table
4. Then run this SQL to apply the policies:

```sql
-- ============================================================================
-- Enable Row Level Security on all user-scoped tables
-- ============================================================================
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS memory_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Users table: Users can only see their own profile
-- ============================================================================
CREATE POLICY IF NOT EXISTS "Users can read own profile"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update own profile"
  ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- Memories table: Users can CRUD only their own memories
-- ============================================================================
CREATE POLICY IF NOT EXISTS "Users can select own memories"
  ON memories
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own memories"
  ON memories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own memories"
  ON memories
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own memories"
  ON memories
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Memory Embeddings table: Users can access their own memory embeddings
-- ============================================================================
CREATE POLICY IF NOT EXISTS "Users can select own memory embeddings"
  ON memory_embeddings
  FOR SELECT
  USING (
    memory_id IN (
      SELECT id FROM memories WHERE user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Users can insert own memory embeddings"
  ON memory_embeddings
  FOR INSERT
  WITH CHECK (
    memory_id IN (
      SELECT id FROM memories WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- Tasks table: Users can CRUD only their own tasks
-- ============================================================================
CREATE POLICY IF NOT EXISTS "Users can select own tasks"
  ON tasks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own tasks"
  ON tasks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own tasks"
  ON tasks
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own tasks"
  ON tasks
  FOR DELETE
  USING (auth.uid() = user_id);
```

5. Click **Run** button
6. ✅ Verify all policies are created

---

## Complete Supabase Setup Checklist

### Phase 1: Database Schema (One-time)
- [ ] Create Supabase project at https://supabase.com
- [ ] In SQL Editor, run `db/schema.sql` to create tables and indexes
- [ ] Verify tables exist: `users`, `memories`, `memory_embeddings`, `tasks`
- [ ] Verify pgvector extension is installed (`CREATE EXTENSION IF NOT EXISTS vector`)

### Phase 2: RPC Function (CRITICAL)
- [ ] Run RPC function SQL (Issue #1 above)
- [ ] Test RPC: Go to SQL Editor and run:
  ```sql
  SELECT * FROM search_memories_by_embedding(
    query_embedding => '[0, 0, 0, ...]'::vector,
    user_id_param => 'test-uuid'::uuid,
    similarity_threshold => 0.5,
    match_limit => 10
  );
  ```
- [ ] ✅ Should return 0 rows (no data yet, but function exists)

### Phase 3: Row-Level Security (CRITICAL)
- [ ] Enable RLS on all 4 tables (Issue #2 above)
- [ ] Run RLS policies SQL
- [ ] Test RLS: Create a test user and verify they can only access their own data

### Phase 4: Environment Variables
- [ ] Copy `.env.example` to `.env.local`
- [ ] Set environment variables:
  ```bash
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  OPENAI_API_KEY=sk-...
  LOCAL_USER_ID=550e8400-e29b-41d4-a716-446655440000  # for local testing
  ```

### Phase 5: Testing
- [ ] Start dev server: `npm run dev`
- [ ] Test creating a memory: POST `/api/input`
- [ ] Test fetching memories: GET `/api/memories`
- [ ] Test keyword search: POST `/api/search` with `type: "keyword"`
- [ ] Test semantic search: POST `/api/search` with `type: "semantic"`
- [ ] Test chat: POST `/api/chat`

---

## Troubleshooting

### "Failed to retrieve memories" error
1. Verify RPC function exists: Run test query in SQL Editor
2. Check OpenAI API key is set
3. Check database has memories with embeddings

### "Unauthorized" errors
1. Verify JWT token is valid (if using auth)
2. Check `LOCAL_USER_ID` is set for local testing
3. Verify RLS policies don't block intended access

### Semantic search returns no results
1. Check pgvector extension is installed: `CREATE EXTENSION IF NOT EXISTS vector`
2. Check IVFFlat index was created (in `db/schema.sql`)
3. Verify OpenAI embedding API is working
4. Test with lower similarity threshold (e.g., 0.3 instead of 0.5)

### Chat endpoint fails
1. Verify RPC function `search_memories_by_embedding` exists
2. Verify OpenAI API key is valid
3. Check server logs for detailed error messages

---

## Performance Optimization

### IVFFlat Index for Vector Search
The schema includes an IVFFlat index optimized for 1000-100k memories:

```sql
CREATE INDEX IF NOT EXISTS idx_memory_embeddings_vector_cosine
  ON memory_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

If you expect >100k memories, increase `lists` parameter:
- **1k-10k memories**: lists = 100 (default)
- **10k-100k memories**: lists = 100-200
- **100k+ memories**: lists = 200-400

Update with:
```sql
REINDEX INDEX idx_memory_embeddings_vector_cosine;
```

### Query Performance Targets
- **Memory fetch**: <100ms (paginated, indexed)
- **Keyword search**: <200ms (ILIKE with pagination)
- **Semantic search**: <500ms (OpenAI API + IVFFlat index)
- **Chat**: <2s (embedding + search + LLM)

---

## Database Migrations (If Needed)

### Adding New Columns
Always use `ALTER TABLE` in Supabase SQL Editor:

```sql
ALTER TABLE memories ADD COLUMN importance_score INT DEFAULT 0;
```

### Dropping Columns
```sql
ALTER TABLE memories DROP COLUMN IF EXISTS importance_score;
```

---

## Security Checklist

- [ ] RLS enabled on all tables
- [ ] RLS policies created for all tables
- [ ] Service role key stored securely (never in frontend)
- [ ] Anon key has minimal permissions
- [ ] OpenAI API key stored as secret (never in frontend)
- [ ] JWT tokens properly validated on server
- [ ] User ID extraction from JWT verified

---

## Support

If you encounter issues:
1. Check Supabase dashboard for error logs
2. Review server logs: `npm run dev`
3. Verify RPC function and RLS policies exist
4. Test individual API routes with curl (see `TESTING.md`)
