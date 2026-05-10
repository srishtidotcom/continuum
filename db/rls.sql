-- RLS policies for Continuum MVP
-- Ensures strict per-user data isolation: users can only access their own memories, tasks, and embeddings

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
-- Memory embeddings table: Users can only access embeddings of their own memories
-- ============================================================================
CREATE POLICY IF NOT EXISTS "Users can select own memory embeddings"
  ON memory_embeddings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memories
      WHERE memories.id = memory_embeddings.memory_id
        AND memories.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Users can insert embeddings for own memories"
  ON memory_embeddings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memories
      WHERE memories.id = memory_embeddings.memory_id
        AND memories.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Users can delete embeddings of own memories"
  ON memory_embeddings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM memories
      WHERE memories.id = memory_embeddings.memory_id
        AND memories.user_id = auth.uid()
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

-- ============================================================================
-- IMPORTANT SECURITY NOTES
-- ============================================================================
-- 1. In Supabase, `auth.uid()` is populated from the JWT token in the Authorization header.
-- 2. Service role key (SUPABASE_SERVICE_ROLE_KEY) bypasses RLS—use with extreme caution on the backend.
-- 3. All client-side requests MUST include valid authenticated user credentials.
-- 4. API routes that use serverSupabase (service role) should validate user_id from JWT before operations.
-- 5. Default deny policy: RLS blocks all access unless explicitly allowed by a policy.
