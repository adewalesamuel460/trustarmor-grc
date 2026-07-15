package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/jackc/pgx/v5"
)

// GetTrustCenterByWorkspace gets or creates a default Trust Center config
func (r *Repository) GetTrustCenterByWorkspace(ctx context.Context, workspaceID string) (*models.TrustCenter, error) {
	var tc models.TrustCenter
	err := r.db.Pool.QueryRow(ctx, `
		SELECT id, workspace_id, url_slug, hero_title, hero_description, primary_color, is_published, created_at, updated_at
		FROM trust_centers
		WHERE workspace_id = $1;
	`, workspaceID).Scan(
		&tc.ID, &tc.WorkspaceID, &tc.URLSlug, &tc.HeroTitle, &tc.HeroDescription,
		&tc.PrimaryColor, &tc.IsPublished, &tc.CreatedAt, &tc.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Create default configuration
			defaultSlug := "workspace-" + workspaceID[:8]
			err = r.db.Pool.QueryRow(ctx, `
				INSERT INTO trust_centers (workspace_id, url_slug, hero_title, hero_description, primary_color, is_published)
				VALUES ($1, $2, 'Security & Compliance Portal', 'Welcome to our public Trust and Security Center. Here you can verify our compliance posture and request secure artifacts.', '#4f46e5', false)
				RETURNING id, workspace_id, url_slug, hero_title, hero_description, primary_color, is_published, created_at, updated_at;
			`, workspaceID, defaultSlug).Scan(
				&tc.ID, &tc.WorkspaceID, &tc.URLSlug, &tc.HeroTitle, &tc.HeroDescription,
				&tc.PrimaryColor, &tc.IsPublished, &tc.CreatedAt, &tc.UpdatedAt,
			)
			if err != nil {
				return nil, fmt.Errorf("failed to auto-create default trust center: %w", err)
			}
			return &tc, nil
		}
		return nil, fmt.Errorf("failed to query trust center: %w", err)
	}

	return &tc, nil
}

// GetTrustCenterBySlug loads a published trust center by public URL slug
func (r *Repository) GetTrustCenterBySlug(ctx context.Context, slug string) (*models.TrustCenter, error) {
	var tc models.TrustCenter
	err := r.db.Pool.QueryRow(ctx, `
		SELECT id, workspace_id, url_slug, hero_title, hero_description, primary_color, is_published, created_at, updated_at
		FROM trust_centers
		WHERE url_slug = $1 AND is_published = true;
	`, slug).Scan(
		&tc.ID, &tc.WorkspaceID, &tc.URLSlug, &tc.HeroTitle, &tc.HeroDescription,
		&tc.PrimaryColor, &tc.IsPublished, &tc.CreatedAt, &tc.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("published trust center not found for slug: %s", slug)
		}
		return nil, fmt.Errorf("failed to lookup trust center: %w", err)
	}
	return &tc, nil
}

// UpdateTrustCenter saves branding updates
func (r *Repository) UpdateTrustCenter(ctx context.Context, tc *models.TrustCenter) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE trust_centers
		SET url_slug = $1, hero_title = $2, hero_description = $3, primary_color = $4, is_published = $5, updated_at = CURRENT_TIMESTAMP
		WHERE id = $6;
	`, tc.URLSlug, tc.HeroTitle, tc.HeroDescription, tc.PrimaryColor, tc.IsPublished, tc.ID)
	if err != nil {
		return fmt.Errorf("failed to update trust center configs: %w", err)
	}
	return nil
}

// GetTrustCenterResources returns mapped items
func (r *Repository) GetTrustCenterResources(ctx context.Context, trustCenterID string) ([]models.TrustCenterResource, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT 
			tcr.id, tcr.trust_center_id, tcr.resource_type, tcr.resource_id, tcr.visibility, tcr.display_order, tcr.created_at,
			COALESCE(f.name, v.name, vd.title, '') as resource_name,
			COALESCE(f.version, v.domain, vd.document_type, '') as resource_details
		FROM trust_center_resources tcr
		LEFT JOIN frameworks f ON tcr.resource_type = 'FRAMEWORK' AND f.id = tcr.resource_id
		LEFT JOIN vendors v ON tcr.resource_type = 'VENDOR' AND v.id = tcr.resource_id
		LEFT JOIN vendor_documents vd ON tcr.resource_type = 'DOCUMENT' AND vd.id = tcr.resource_id
		WHERE tcr.trust_center_id = $1
		ORDER BY tcr.display_order ASC, tcr.created_at DESC;
	`, trustCenterID)
	if err != nil {
		return nil, fmt.Errorf("failed to query trust center resources: %w", err)
	}
	defer rows.Close()

	var resources []models.TrustCenterResource
	for rows.Next() {
		var res models.TrustCenterResource
		err := rows.Scan(
			&res.ID, &res.TrustCenterID, &res.ResourceType, &res.ResourceID,
			&res.Visibility, &res.DisplayOrder, &res.CreatedAt,
			&res.ResourceName, &res.ResourceDetails,
		)
		if err == nil {
			resources = append(resources, res)
		}
	}
	return resources, nil
}

// AddTrustCenterResource creates a resource link mapping
func (r *Repository) AddTrustCenterResource(ctx context.Context, res *models.TrustCenterResource) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO trust_center_resources (trust_center_id, resource_type, resource_id, visibility, display_order)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (trust_center_id, resource_type, resource_id) 
		DO UPDATE SET visibility = EXCLUDED.visibility, display_order = EXCLUDED.display_order
		RETURNING id, created_at;
	`, res.TrustCenterID, res.ResourceType, res.ResourceID, res.Visibility, res.DisplayOrder).Scan(&res.ID, &res.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to map trust center resource: %w", err)
	}
	return nil
}

// RemoveTrustCenterResource unmaps a resource
func (r *Repository) RemoveTrustCenterResource(ctx context.Context, trustCenterID string, resourceID string) error {
	_, err := r.db.Pool.Exec(ctx, `
		DELETE FROM trust_center_resources 
		WHERE trust_center_id = $1 AND resource_id = $2;
	`, trustCenterID, resourceID)
	if err != nil {
		return fmt.Errorf("failed to remove resource mapping: %w", err)
	}
	return nil
}

// GetNDARequests fetches requests along with requested document titles
func (r *Repository) GetNDARequests(ctx context.Context, trustCenterID string) ([]models.NDARequest, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT 
			nr.id, nr.trust_center_id, nr.resource_id, nr.requester_email, nr.requester_company, nr.reason, nr.status, nr.expires_at, nr.created_at,
			vd.title as document_title
		FROM nda_requests nr
		JOIN vendor_documents vd ON nr.resource_id = vd.id
		WHERE nr.trust_center_id = $1
		ORDER BY nr.created_at DESC;
	`, trustCenterID)
	if err != nil {
		return nil, fmt.Errorf("failed to query NDA requests: %w", err)
	}
	defer rows.Close()

	var list []models.NDARequest
	for rows.Next() {
		var req models.NDARequest
		err := rows.Scan(
			&req.ID, &req.TrustCenterID, &req.ResourceID, &req.RequesterEmail, &req.RequesterCompany,
			&req.Reason, &req.Status, &req.ExpiresAt, &req.CreatedAt, &req.DocumentTitle,
		)
		if err == nil {
			list = append(list, req)
		}
	}
	return list, nil
}

// CreateNDARequest records request from public buyer
func (r *Repository) CreateNDARequest(ctx context.Context, req *models.NDARequest) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO nda_requests (trust_center_id, resource_id, requester_email, requester_company, reason, status)
		VALUES ($1, $2, $3, $4, $5, 'pending')
		RETURNING id, created_at;
	`, req.TrustCenterID, req.ResourceID, req.RequesterEmail, req.RequesterCompany, req.Reason).Scan(&req.ID, &req.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create NDA request record: %w", err)
	}
	req.Status = "pending"
	return nil
}

// GetNDARequestByID fetches details and underlying document file URL
func (r *Repository) GetNDARequestByID(ctx context.Context, id string) (*models.NDARequest, string, error) {
	var req models.NDARequest
	var fileURL string
	err := r.db.Pool.QueryRow(ctx, `
		SELECT 
			nr.id, nr.trust_center_id, nr.resource_id, nr.requester_email, nr.requester_company, nr.reason, nr.status, nr.expires_at, nr.created_at,
			vd.title as document_title, vd.file_url
		FROM nda_requests nr
		JOIN vendor_documents vd ON nr.resource_id = vd.id
		WHERE nr.id = $1;
	`, id).Scan(
		&req.ID, &req.TrustCenterID, &req.ResourceID, &req.RequesterEmail, &req.RequesterCompany,
		&req.Reason, &req.Status, &req.ExpiresAt, &req.CreatedAt, &req.DocumentTitle, &fileURL,
	)
	if err != nil {
		return nil, "", err
	}
	return &req, fileURL, nil
}

// ApproveNDARequest updates status and expiration date
func (r *Repository) ApproveNDARequest(ctx context.Context, id string, expiresAt time.Time) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE nda_requests
		SET status = 'approved', expires_at = $1
		WHERE id = $2;
	`, expiresAt, id)
	return err
}
