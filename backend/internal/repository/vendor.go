package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/jackc/pgx/v5"
)

// GetVendors retrieves all vendors in a workspace with owner emails and expiring docs indicator
func (r *Repository) GetVendors(ctx context.Context, workspaceID string) ([]models.Vendor, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT v.id, v.workspace_id, v.name, v.domain, v.description, v.risk_tier, v.status, v.owner_id, u.email as owner_email, v.created_at, v.updated_at,
		       EXISTS (
		           SELECT 1 FROM vendor_documents vd
		           WHERE vd.vendor_id = v.id AND vd.expires_at IS NOT NULL AND vd.expires_at <= NOW() + INTERVAL '30 days'
		       ) as has_expiring_docs
		FROM vendors v
		LEFT JOIN users u ON v.owner_id = u.id
		WHERE v.workspace_id = $1
		ORDER BY v.created_at DESC;
	`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query vendors: %w", err)
	}
	defer rows.Close()

	var vendors []models.Vendor
	for rows.Next() {
		var v models.Vendor
		err := rows.Scan(
			&v.ID, &v.WorkspaceID, &v.Name, &v.Domain, &v.Description, &v.RiskTier, &v.Status,
			&v.OwnerID, &v.OwnerEmail, &v.CreatedAt, &v.UpdatedAt, &v.HasExpiringDocs,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan vendor: %w", err)
		}
		v.Documents = []models.VendorDocument{}
		vendors = append(vendors, v)
	}

	return vendors, nil
}

// CreateVendor creates a new vendor
func (r *Repository) CreateVendor(ctx context.Context, v *models.Vendor) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO vendors (workspace_id, name, domain, description, risk_tier, status, owner_id)
		VALUES ($1, $2, $3, $4, $5, 'active', $6)
		RETURNING id, created_at, updated_at;
	`, v.WorkspaceID, v.Name, v.Domain, v.Description, v.RiskTier, v.OwnerID).Scan(&v.ID, &v.CreatedAt, &v.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create vendor: %w", err)
	}
	v.Status = "active"
	v.Documents = []models.VendorDocument{}
	return nil
}

// UpdateVendor updates vendor metadata
func (r *Repository) UpdateVendor(ctx context.Context, v *models.Vendor) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE vendors
		SET name = $1, domain = $2, description = $3, risk_tier = $4, status = $5, owner_id = $6, updated_at = CURRENT_TIMESTAMP
		WHERE id = $7;
	`, v.Name, v.Domain, v.Description, v.RiskTier, v.Status, v.OwnerID, v.ID)
	if err != nil {
		return fmt.Errorf("failed to update vendor: %w", err)
	}
	return nil
}

// GetVendorByID retrieves a single vendor with nested documents
func (r *Repository) GetVendorByID(ctx context.Context, id string) (*models.Vendor, error) {
	var v models.Vendor
	err := r.db.Pool.QueryRow(ctx, `
		SELECT v.id, v.workspace_id, v.name, v.domain, v.description, v.risk_tier, v.status, v.owner_id, u.email as owner_email, v.created_at, v.updated_at,
		       EXISTS (
		           SELECT 1 FROM vendor_documents vd
		           WHERE vd.vendor_id = v.id AND vd.expires_at IS NOT NULL AND vd.expires_at <= NOW() + INTERVAL '30 days'
		       ) as has_expiring_docs
		FROM vendors v
		LEFT JOIN users u ON v.owner_id = u.id
		WHERE v.id = $1;
	`, id).Scan(
		&v.ID, &v.WorkspaceID, &v.Name, &v.Domain, &v.Description, &v.RiskTier, &v.Status,
		&v.OwnerID, &v.OwnerEmail, &v.CreatedAt, &v.UpdatedAt, &v.HasExpiringDocs,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("vendor not found: %w", err)
		}
		return nil, fmt.Errorf("failed to query vendor: %w", err)
	}

	v.Documents = []models.VendorDocument{}

	// Query documents
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, vendor_id, document_type, title, file_url, valid_from, expires_at, created_at
		FROM vendor_documents
		WHERE vendor_id = $1
		ORDER BY created_at DESC;
	`, id)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var doc models.VendorDocument
			err := rows.Scan(
				&doc.ID, &doc.VendorID, &doc.DocumentType, &doc.Title, &doc.FileURL,
				&doc.ValidFrom, &doc.ExpiresAt, &doc.CreatedAt,
			)
			if err == nil {
				v.Documents = append(v.Documents, doc)
			}
		}
	}

	return &v, nil
}

// AddVendorDocument uploads a document reference to the vendor
func (r *Repository) AddVendorDocument(ctx context.Context, doc *models.VendorDocument) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO vendor_documents (vendor_id, document_type, title, file_url, valid_from, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at;
	`, doc.VendorID, doc.DocumentType, doc.Title, doc.FileURL, doc.ValidFrom, doc.ExpiresAt).Scan(&doc.ID, &doc.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create vendor document record: %w", err)
	}
	return nil
}

// DeleteVendorDocument removes a document reference
func (r *Repository) DeleteVendorDocument(ctx context.Context, docID string) error {
	_, err := r.db.Pool.Exec(ctx, `DELETE FROM vendor_documents WHERE id = $1;`, docID)
	if err != nil {
		return fmt.Errorf("failed to delete vendor document: %w", err)
	}
	return nil
}

type ExpiringDocResult struct {
	ID         string
	Title      string
	ExpiresAt  string
	VendorName string
}

// GetExpiringVendorDocuments returns a list of documents expiring in exactly 'days' days
func (r *Repository) GetExpiringVendorDocuments(ctx context.Context, days int) ([]ExpiringDocResult, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT vd.id, vd.title, TO_CHAR(vd.expires_at, 'YYYY-MM-DD') as expires_at, v.name as vendor_name
		FROM vendor_documents vd
		JOIN vendors v ON vd.vendor_id = v.id
		WHERE vd.expires_at IS NOT NULL AND DATE(vd.expires_at) = CURRENT_DATE + $1;
	`, days)
	if err != nil {
		return nil, fmt.Errorf("failed to query expiring documents: %w", err)
	}
	defer rows.Close()

	var results []ExpiringDocResult
	for rows.Next() {
		var res ExpiringDocResult
		if err := rows.Scan(&res.ID, &res.Title, &res.ExpiresAt, &res.VendorName); err == nil {
			results = append(results, res)
		}
	}
	return results, nil
}
