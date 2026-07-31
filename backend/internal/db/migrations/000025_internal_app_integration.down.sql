-- Down migration 000025
DROP INDEX IF EXISTS idx_workspace_integrations_api_key_hash;
ALTER TABLE workspace_integrations DROP COLUMN IF EXISTS api_key_hash;
ALTER TABLE workspace_integrations DROP COLUMN IF EXISTS product_id;
DELETE FROM integration_providers WHERE id = 'c0000000-0000-0000-0000-000000000004';
