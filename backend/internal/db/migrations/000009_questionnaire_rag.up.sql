-- Enable the pgvector extension (must be installed on the Postgres server)
CREATE EXTENSION IF NOT EXISTS vector;

-- The source of truth for AI generation
CREATE TABLE knowledge_base_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    source_type VARCHAR(50) DEFAULT 'manual', -- 'manual', 'policy_extraction', 'past_questionnaire'
    tags TEXT[],
    embedding vector(1536), -- Assuming OpenAI text-embedding-3-small
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Represents an uploaded questionnaire document
CREATE TABLE questionnaire_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'generating', 'in_review', 'completed'
    total_questions INTEGER DEFAULT 0,
    completed_questions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Individual Q&A pairs within a project
CREATE TABLE questionnaire_pairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES questionnaire_projects(id) ON DELETE CASCADE,
    original_question TEXT NOT NULL,
    ai_draft_answer TEXT,
    final_answer TEXT,
    confidence_score FLOAT, -- 0.0 to 1.0 based on vector similarity
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'drafted', 'approved', 'rejected'
    reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- HNSW Index for fast vector similarity search
CREATE INDEX idx_kb_embedding ON knowledge_base_items USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_questionnaire_pairs_project ON questionnaire_pairs(project_id);
