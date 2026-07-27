package repository

import (
	"context"

	"testing"
	"time"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/db"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/pashagolub/pgxmock/v3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUpsertAsset(t *testing.T) {
	mockPool, err := pgxmock.NewPool()
	require.NoError(t, err)
	defer mockPool.Close()

	database := &db.DB{Pool: mockPool}
	repo := New(database)
	ctx := context.Background()

	now := time.Now()
	asset := &models.Asset{
		WorkspaceID:    "ws-123",
		IntegrationID:  "int-456",
		AssetType:      "cloud_user",
		ExternalID:     "usr-001",
		Name:           "admin@company.com",
		RawData:        map[string]interface{}{"mfa_active": true},
		ComplianceRisk: false,
		LastDiscovered: now,
	}

	mockPool.ExpectQuery(`INSERT INTO assets`).
		WithArgs(asset.WorkspaceID, asset.IntegrationID, asset.AssetType, asset.ExternalID, asset.Name, pgxmock.AnyArg(), asset.ComplianceRisk, asset.LastDiscovered).
		WillReturnRows(pgxmock.NewRows([]string{"id"}).AddRow("asset-id-999"))

	err = repo.UpsertAsset(ctx, asset)
	require.NoError(t, err)
	assert.Equal(t, "asset-id-999", asset.ID)
	assert.NoError(t, mockPool.ExpectationsWereMet())
}

func TestGetWorkspaceAssets(t *testing.T) {
	mockPool, err := pgxmock.NewPool()
	require.NoError(t, err)
	defer mockPool.Close()

	database := &db.DB{Pool: mockPool}
	repo := New(database)
	ctx := context.Background()

	t.Run("Get all workspace assets without type filter", func(t *testing.T) {
		now := time.Now()
		rows := pgxmock.NewRows([]string{
			"id", "workspace_id", "integration_id", "asset_type", "external_id", "name", "raw_data", "compliance_risk", "last_discovered",
		}).
			AddRow("ast-1", "ws-123", "int-1", "cloud_user", "usr-1", "user1", []byte(`{"mfa_active":true}`), false, now).
			AddRow("ast-2", "ws-123", "int-1", "cloud_storage", "s3-1", "bucket1", []byte(`{"encrypted_at_rest":true}`), false, now)

		mockPool.ExpectQuery(`SELECT id, workspace_id, integration_id, asset_type, external_id, name, raw_data, compliance_risk, last_discovered FROM assets WHERE workspace_id = \$1 ORDER BY last_discovered DESC;`).
			WithArgs("ws-123").
			WillReturnRows(rows)

		assets, err := repo.GetWorkspaceAssets(ctx, "ws-123", "")
		require.NoError(t, err)
		assert.Len(t, assets, 2)
		assert.Equal(t, "ast-1", assets[0].ID)
		assert.Equal(t, "ast-2", assets[1].ID)
		assert.NoError(t, mockPool.ExpectationsWereMet())
	})

	t.Run("Get workspace assets filtered by asset_type", func(t *testing.T) {
		now := time.Now()
		rows := pgxmock.NewRows([]string{
			"id", "workspace_id", "integration_id", "asset_type", "external_id", "name", "raw_data", "compliance_risk", "last_discovered",
		}).
			AddRow("ast-1", "ws-123", "int-1", "cloud_user", "usr-1", "user1", []byte(`{"mfa_active":true}`), false, now)

		mockPool.ExpectQuery(`SELECT id, workspace_id, integration_id, asset_type, external_id, name, raw_data, compliance_risk, last_discovered FROM assets WHERE workspace_id = \$1 AND asset_type = \$2 ORDER BY last_discovered DESC;`).
			WithArgs("ws-123", "cloud_user").
			WillReturnRows(rows)

		assets, err := repo.GetWorkspaceAssets(ctx, "ws-123", "cloud_user")
		require.NoError(t, err)
		assert.Len(t, assets, 1)
		assert.Equal(t, "cloud_user", assets[0].AssetType)
		assert.NoError(t, mockPool.ExpectationsWereMet())
	})
}
