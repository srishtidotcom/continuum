-- Supabase / Postgres schema for Continuum MVP

-- Users table (managed by Supabase Auth in production)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Memories: raw captures
CREATE TABLE IF NOT EXISTS memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  text text NOT NULL,
  half_baked boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Embeddings stored in pgvector. Dimension set to 1536 for text-embedding-3-small
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS memory_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id uuid REFERENCES memories(id) ON DELETE CASCADE,
  embedding vector(1536),
  created_at timestamptz DEFAULT now()
);

-- Extracted tasks
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  memory_id uuid REFERENCES memories(id) ON DELETE SET NULL,
  title text,
  due_date timestamptz,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RPC function for semantic search using pgvector cosine similarity
-- Usage: SELECT * FROM search_memories_by_embedding(
--   query_embedding => '[1, 2, 3, ...]'::vector,
--   user_id_param => 'user-uuid',
--   similarity_threshold => 0.5,
--   match_limit => 20
-- );
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_user_created_at ON memories(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_embeddings_memory_id ON memory_embeddings(memory_id);

-- IVFFlat index for faster vector similarity search (requires pgvector)
-- Note: This index is optimized for cosine similarity searches
CREATE INDEX IF NOT EXISTS idx_memory_embeddings_vector_cosine
  ON memory_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
