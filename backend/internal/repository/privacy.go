package repository

import (
	"context"
	"fmt"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
)

// CreateAIAsset inserts a new AI tool record
func (r *Repository) CreateAIAsset(ctx context.Context, asset *models.AIAsset) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO ai_assets (workspace_id, tool_name, vendor_id, business_purpose, data_classification, approval_status)
		VALUES ($1, $2, $3, $4, $5, COALESCE(NULLIF($6, ''), 'under_review'))
		RETURNING id, approval_status, created_at, updated_at;
	`, asset.WorkspaceID, asset.ToolName, asset.VendorID, asset.BusinessPurpose, asset.DataClassification, asset.ApprovalStatus).
		Scan(&asset.ID, &asset.ApprovalStatus, &asset.CreatedAt, &asset.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create AI asset: %w", err)
	}
	return nil
}

// ListAIAssets lists AI assets in the workspace
func (r *Repository) ListAIAssets(ctx context.Context, workspaceID string) ([]models.AIAsset, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT a.id, a.workspace_id, a.tool_name, a.vendor_id, a.business_purpose, a.data_classification, a.approval_status, a.created_at, a.updated_at,
		       v.name as vendor_name
		FROM ai_assets a
		LEFT JOIN vendors v ON a.vendor_id = v.id
		WHERE a.workspace_id = $1
		ORDER BY a.created_at DESC;
	`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query AI assets: %w", err)
	}
	defer rows.Close()

	var list []models.AIAsset
	for rows.Next() {
		var a models.AIAsset
		err := rows.Scan(
			&a.ID, &a.WorkspaceID, &a.ToolName, &a.VendorID, &a.BusinessPurpose, &a.DataClassification, &a.ApprovalStatus, &a.CreatedAt, &a.UpdatedAt,
			&a.VendorName,
		)
		if err == nil {
			list = append(list, a)
		}
	}
	return list, nil
}

// UpdateAIAssetApproval updates approval status or classification of an AI tool
func (r *Repository) UpdateAIAssetApproval(ctx context.Context, id string, approvalStatus string, dataClassification string) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE ai_assets
		SET approval_status = COALESCE(NULLIF($1, ''), approval_status),
		    data_classification = COALESCE(NULLIF($2, ''), data_classification),
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $3;
	`, approvalStatus, dataClassification, id)
	return err
}

// CreateDataTransfer registers a cross-border data transfer
func (r *Repository) CreateDataTransfer(ctx context.Context, dt *models.DataTransfer) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO data_transfers (workspace_id, vendor_id, origin_country, destination_country, data_categories, legal_basis, status)
		VALUES ($1, $2, COALESCE(NULLIF($3, ''), 'Nigeria'), $4, $5, $6, 'active')
		RETURNING id, origin_country, status, created_at;
	`, dt.WorkspaceID, dt.VendorID, dt.OriginCountry, dt.DestinationCountry, dt.DataCategories, dt.LegalBasis).
		Scan(&dt.ID, &dt.OriginCountry, &dt.Status, &dt.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create data transfer flow: %w", err)
	}
	return nil
}

// ListDataTransfers lists cross-border transfers
func (r *Repository) ListDataTransfers(ctx context.Context, workspaceID string) ([]models.DataTransfer, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT dt.id, dt.workspace_id, dt.vendor_id, dt.origin_country, dt.destination_country, dt.data_categories, dt.legal_basis, dt.status, dt.created_at,
		       v.name as vendor_name
		FROM data_transfers dt
		LEFT JOIN vendors v ON dt.vendor_id = v.id
		WHERE dt.workspace_id = $1
		ORDER BY dt.created_at DESC;
	`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query data transfers: %w", err)
	}
	defer rows.Close()

	var list []models.DataTransfer
	for rows.Next() {
		var dt models.DataTransfer
		err := rows.Scan(
			&dt.ID, &dt.WorkspaceID, &dt.VendorID, &dt.OriginCountry, &dt.DestinationCountry, &dt.DataCategories, &dt.LegalBasis, &dt.Status, &dt.CreatedAt,
			&dt.VendorName,
		)
		if err == nil {
			list = append(list, dt)
		}
	}
	return list, nil
}

// ListRegulatoryFilings lists all regulatory audit records in the workspace
func (r *Repository) ListRegulatoryFilings(ctx context.Context, workspaceID string) ([]models.RegulatoryFiling, error) {
	// Auto update status to overdue if deadline passed and status is pending
	_, _ = r.db.Pool.Exec(ctx, `
		UPDATE regulatory_filings
		SET status = 'overdue'
		WHERE workspace_id = $1 AND status = 'pending' AND due_date < CURRENT_DATE;
	`, workspaceID)

	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, workspace_id, regulator, filing_year, due_date::text, status, submitted_at, dpo_name, evidence_id, created_at
		FROM regulatory_filings
		WHERE workspace_id = $1
		ORDER BY due_date ASC;
	`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query regulatory filings: %w", err)
	}
	defer rows.Close()

	var list []models.RegulatoryFiling
	for rows.Next() {
		var rf models.RegulatoryFiling
		err := rows.Scan(
			&rf.ID, &rf.WorkspaceID, &rf.Regulator, &rf.FilingYear, &rf.DueDate, &rf.Status, &rf.SubmittedAt, &rf.DPOName, &rf.EvidenceID, &rf.CreatedAt,
		)
		if err == nil {
			list = append(list, rf)
		}
	}
	return list, nil
}

// CreateRegulatoryFiling logs a new audit deadline config
func (r *Repository) CreateRegulatoryFiling(ctx context.Context, rf *models.RegulatoryFiling) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO regulatory_filings (workspace_id, regulator, filing_year, due_date, status, dpo_name)
		VALUES ($1, $2, $3, $4::date, 'pending', $5)
		ON CONFLICT (workspace_id, regulator, filing_year) DO UPDATE SET due_date = EXCLUDED.due_date, dpo_name = EXCLUDED.dpo_name
		RETURNING id, status, created_at;
	`, rf.WorkspaceID, rf.Regulator, rf.FilingYear, rf.DueDate, rf.DPOName).
		Scan(&rf.ID, &rf.Status, &rf.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create regulatory filing task: %w", err)
	}
	return nil
}

// GetRegulatoryFiling fetches single record
func (r *Repository) GetRegulatoryFiling(ctx context.Context, id string) (*models.RegulatoryFiling, error) {
	var rf models.RegulatoryFiling
	err := r.db.Pool.QueryRow(ctx, `
		SELECT id, workspace_id, regulator, filing_year, due_date::text, status, submitted_at, dpo_name, evidence_id, created_at
		FROM regulatory_filings
		WHERE id = $1;
	`, id).Scan(&rf.ID, &rf.WorkspaceID, &rf.Regulator, &rf.FilingYear, &rf.DueDate, &rf.Status, &rf.SubmittedAt, &rf.DPOName, &rf.EvidenceID, &rf.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &rf, nil
}

// SubmitRegulatoryFiling marks regulatory audit as completed
func (r *Repository) SubmitRegulatoryFiling(ctx context.Context, filingID string, evidenceID string) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE regulatory_filings
		SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP, evidence_id = $1
		WHERE id = $2;
	`, evidenceID, filingID)
	return err
}

// SeedInitialFilings seeds next annual NITDA audit filing if list is empty
func (r *Repository) SeedInitialFilings(ctx context.Context, workspaceID string) {
	var count int
	err := r.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM regulatory_filings WHERE workspace_id = $1`, workspaceID).Scan(&count)
	if err == nil && count == 0 {
		// Seed NITDA 2026 audit
		rf := models.RegulatoryFiling{
			WorkspaceID: workspaceID,
			Regulator:   "NITDA / NDPC Audit",
			FilingYear:  2026,
			DueDate:     "2026-06-30",
			DPOName:     nil,
		}
		_ = r.CreateRegulatoryFiling(ctx, &rf)
	}
}
