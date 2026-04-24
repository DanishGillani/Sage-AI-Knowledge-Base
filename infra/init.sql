-- Enable pgvector extension — required before any vector columns can be created
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify it's loaded
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
