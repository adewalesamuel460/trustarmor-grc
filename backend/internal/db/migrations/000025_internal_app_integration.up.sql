-- Migration 000025: Internal App Integration Provider & API Key Authentication Support

-- 1. Register internal_app in integration_providers with UUID c0000000-0000-0000-0000-000000000004
INSERT INTO integration_providers (id, name, category, auth_type, logo_url)
VALUES ('c0000000-0000-0000-0000-000000000004', 'Internal Application (SDK)', 'Internal Applications', 'api_key', '/logos/internal_app.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, auth_type = EXCLUDED.auth_type;

-- 2. Add product_id and api_key_hash columns to workspace_integrations and allow null encrypted_credentials
ALTER TABLE workspace_integrations 
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS api_key_hash TEXT,
ALTER COLUMN encrypted_credentials DROP NOT NULL;

-- 3. Create index on api_key_hash for fast Bearer token lookup
CREATE INDEX IF NOT EXISTS idx_workspace_integrations_api_key_hash ON workspace_integrations(api_key_hash);
