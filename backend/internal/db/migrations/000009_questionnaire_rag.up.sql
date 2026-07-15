-- Note: pgvector extension is used when available for optimized similarity search.
-- Fallback: embedding is stored as FLOAT[] for compatibility with standard PostgreSQL 12+.
-- The application layer computes cosine similarity in Go when pgvector is unavailable.

-- The source of truth for AI generation
CREATE TABLE IF NOT EXISTS knowledge_base_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    source_type VARCHAR(50) DEFAULT 'manual', -- 'manual', 'policy_extraction', 'past_questionnaire'
    tags TEXT[],
    embedding FLOAT[], -- Stored as float array; cosine similarity computed in Go
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Represents an uploaded questionnaire document
CREATE TABLE IF NOT EXISTS questionnaire_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'generating', 'in_review', 'completed'
    total_questions INTEGER DEFAULT 0,
    completed_questions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Individual Q&A pairs within a project
CREATE TABLE IF NOT EXISTS questionnaire_pairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES questionnaire_projects(id) ON DELETE CASCADE,
    original_question TEXT NOT NULL,
    ai_draft_answer TEXT,
    final_answer TEXT,
    confidence_score FLOAT, -- 0.0 to 1.0 based on vector similarity
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'drafted', 'approved', 'rejected'
    reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_questionnaire_pairs_project ON questionnaire_pairs(project_id);
CREATE INDEX IF NOT EXISTS idx_kb_workspace ON knowledge_base_items(workspace_id);
