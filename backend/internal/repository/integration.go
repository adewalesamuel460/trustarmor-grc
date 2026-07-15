package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/jackc/pgx/v5"
)

// GetIntegrationProviders retrieves all globally cataloged integrations
func (r *Repository) GetIntegrationProviders(ctx context.Context) ([]models.IntegrationProvider, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, name, category, auth_type, logo_url, created_at
		FROM integration_providers
		ORDER BY name ASC;
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query integration providers: %w", err)
	}
	defer rows.Close()

	var providers []models.IntegrationProvider
	for rows.Next() {
		var p models.IntegrationProvider
		err := rows.Scan(&p.ID, &p.Name, &p.Category, &p.AuthType, &p.LogoURL, &p.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan provider: %w", err)
		}
		providers = append(providers, p)
	}

	return providers, nil
}

// GetWorkspaceIntegrations lists connected integrations for a workspace
func (r *Repository) GetWorkspaceIntegrations(ctx context.Context, workspaceID string) ([]models.WorkspaceIntegration, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT wi.id, wi.workspace_id, wi.provider_id, wi.status, wi.encrypted_credentials, wi.last_sync_at, wi.created_at, wi.updated_at,
		       ip.name as provider_name, ip.category as provider_category
		FROM workspace_integrations wi
		JOIN integration_providers ip ON wi.provider_id = ip.id
		WHERE wi.workspace_id = $1
		ORDER BY wi.created_at DESC;
	`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query workspace integrations: %w", err)
	}
	defer rows.Close()

	var integrations []models.WorkspaceIntegration
	for rows.Next() {
		var wi models.WorkspaceIntegration
		err := rows.Scan(
			&wi.ID, &wi.WorkspaceID, &wi.ProviderID, &wi.Status, &wi.EncryptedCredentials, 
			&wi.LastSyncAt, &wi.CreatedAt, &wi.UpdatedAt, &wi.ProviderName, &wi.ProviderCategory,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan workspace integration: %w", err)
		}
		integrations = append(integrations, wi)
	}

	return integrations, nil
}

// GetWorkspaceIntegrationByID retrieves a single connection by ID
func (r *Repository) GetWorkspaceIntegrationByID(ctx context.Context, id string) (*models.WorkspaceIntegration, error) {
	var wi models.WorkspaceIntegration
	err := r.db.Pool.QueryRow(ctx, `
		SELECT wi.id, wi.workspace_id, wi.provider_id, wi.status, wi.encrypted_credentials, wi.last_sync_at, wi.created_at, wi.updated_at,
		       ip.name as provider_name, ip.category as provider_category
		FROM workspace_integrations wi
		JOIN integration_providers ip ON wi.provider_id = ip.id
		WHERE wi.id = $1;
	`, id).Scan(
		&wi.ID, &wi.WorkspaceID, &wi.ProviderID, &wi.Status, &wi.EncryptedCredentials, 
		&wi.LastSyncAt, &wi.CreatedAt, &wi.UpdatedAt, &wi.ProviderName, &wi.ProviderCategory,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("workspace integration not found: %w", err)
		}
		return nil, fmt.Errorf("failed to get workspace integration: %w", err)
	}
	return &wi, nil
}

// ConnectIntegration inserts or updates a workspace connection
func (r *Repository) ConnectIntegration(ctx context.Context, workspaceID, providerID string, encryptedCredentials []byte) (*models.WorkspaceIntegration, error) {
	var wi models.WorkspaceIntegration
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO workspace_integrations (workspace_id, provider_id, status, encrypted_credentials)
		VALUES ($1, $2, 'connected', $3)
		ON CONFLICT (workspace_id, provider_id)
		DO UPDATE SET status = 'connected', encrypted_credentials = $3, updated_at = CURRENT_TIMESTAMP
		RETURNING id, workspace_id, provider_id, status, encrypted_credentials, last_sync_at, created_at, updated_at;
	`, workspaceID, providerID, encryptedCredentials).Scan(
		&wi.ID, &wi.WorkspaceID, &wi.ProviderID, &wi.Status, &wi.EncryptedCredentials, &wi.LastSyncAt, &wi.CreatedAt, &wi.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to connect workspace integration: %w", err)
	}
	return &wi, nil
}

// UpdateIntegrationStatus updates status and last_sync_at fields
func (r *Repository) UpdateIntegrationStatus(ctx context.Context, id string, status string, lastSyncAt time.Time) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE workspace_integrations
		SET status = $1, last_sync_at = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3;
	`, status, lastSyncAt, id)
	if err != nil {
		return fmt.Errorf("failed to update integration status: %w", err)
	}
	return nil
}

// CreateSyncLog registers a sync attempt log entry
func (r *Repository) CreateSyncLog(ctx context.Context, log *models.SyncLog) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO sync_logs (workspace_integration_id, status, records_fetched, error_message, started_at, completed_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id;
	`, log.WorkspaceIntegrationID, log.Status, log.RecordsFetched, log.ErrorMessage, log.StartedAt, log.CompletedAt).Scan(&log.ID)
	if err != nil {
		return fmt.Errorf("failed to insert sync log: %w", err)
	}
	return nil
}

// GetSyncLogs fetches history logs for a workspace integration connection
func (r *Repository) GetSyncLogs(ctx context.Context, integrationID string) ([]models.SyncLog, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, workspace_integration_id, status, records_fetched, error_message, started_at, completed_at,
		       (EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)::bigint as duration_ms
		FROM sync_logs
		WHERE workspace_integration_id = $1
		ORDER BY started_at DESC;
	`, integrationID)
	if err != nil {
		return nil, fmt.Errorf("failed to query sync logs: %w", err)
	}
	defer rows.Close()

	var logs []models.SyncLog
	for rows.Next() {
		var l models.SyncLog
		err := rows.Scan(
			&l.ID, &l.WorkspaceIntegrationID, &l.Status, &l.RecordsFetched, 
			&l.ErrorMessage, &l.StartedAt, &l.CompletedAt, &l.DurationMs,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan sync log: %w", err)
		}
		logs = append(logs, l)
	}

	return logs, nil
}
