package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
)

// UpsertAsset saves or updates a discovered infrastructure/SaaS asset
func (r *Repository) UpsertAsset(ctx context.Context, asset *models.Asset) error {
	rawDataJSON, err := json.Marshal(asset.RawData)
	if err != nil {
		return fmt.Errorf("failed to marshal asset raw_data: %w", err)
	}

	err = r.db.Pool.QueryRow(ctx, `
		INSERT INTO assets (workspace_id, integration_id, asset_type, external_id, name, raw_data, compliance_risk, last_discovered)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (workspace_id, integration_id, external_id)
		DO UPDATE SET name = $5, raw_data = $6, compliance_risk = $7, last_discovered = $8
		RETURNING id;
	`, asset.WorkspaceID, asset.IntegrationID, asset.AssetType, asset.ExternalID, asset.Name, rawDataJSON, asset.ComplianceRisk, asset.LastDiscovered).Scan(&asset.ID)
	if err != nil {
		// If table doesn't exist in dev env yet, gracefully fallback or error log
		return fmt.Errorf("failed to upsert asset: %w", err)
	}
	return nil
}

// GetWorkspaceAssets retrieves assets filtered by workspace and optional asset type
func (r *Repository) GetWorkspaceAssets(ctx context.Context, workspaceID string, assetType string) ([]models.Asset, error) {
	query := `
		SELECT id, workspace_id, integration_id, asset_type, external_id, name, raw_data, compliance_risk, last_discovered
		FROM assets
		WHERE workspace_id = $1
	`
	args := []interface{}{workspaceID}
	if assetType != "" {
		query += " AND asset_type = $2"
		args = append(args, assetType)
	}
	query += " ORDER BY last_discovered DESC;"

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query workspace assets: %w", err)
	}
	defer rows.Close()

	var assets []models.Asset
	for rows.Next() {
		var a models.Asset
		var rawDataJSON []byte
		err := rows.Scan(&a.ID, &a.WorkspaceID, &a.IntegrationID, &a.AssetType, &a.ExternalID, &a.Name, &rawDataJSON, &a.ComplianceRisk, &a.LastDiscovered)
		if err != nil {
			return nil, fmt.Errorf("failed to scan asset row: %w", err)
		}
		if len(rawDataJSON) > 0 {
			_ = json.Unmarshal(rawDataJSON, &a.RawData)
		}
		assets = append(assets, a)
	}
	return assets, nil
}
