package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/jackc/pgx/v5"
)

// GetPolicies retrieves all policies in a workspace
func (r *Repository) GetPolicies(ctx context.Context, workspaceID string) ([]models.Policy, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, workspace_id, title, description, content, status, current_version, created_at, updated_at
		FROM policies
		WHERE workspace_id = $1
		ORDER BY created_at DESC;
	`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query policies: %w", err)
	}
	defer rows.Close()

	var policies []models.Policy
	for rows.Next() {
		var p models.Policy
		err := rows.Scan(&p.ID, &p.WorkspaceID, &p.Title, &p.Description, &p.Content, &p.Status, &p.CurrentVersion, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan policy: %w", err)
		}
		policies = append(policies, p)
	}

	return policies, nil
}

// CreatePolicy creates a draft policy
func (r *Repository) CreatePolicy(ctx context.Context, p *models.Policy) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO policies (workspace_id, title, description, content, status, current_version)
		VALUES ($1, $2, $3, $4, 'draft', 0)
		RETURNING id, created_at, updated_at;
	`, p.WorkspaceID, p.Title, p.Description, p.Content).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create policy: %w", err)
	}
	p.Status = "draft"
	p.CurrentVersion = 0
	return nil
}

// UpdatePolicy updates the content of a draft policy
func (r *Repository) UpdatePolicy(ctx context.Context, p *models.Policy) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE policies
		SET title = $1, description = $2, content = $3, updated_at = CURRENT_TIMESTAMP
		WHERE id = $4 AND status = 'draft';
	`, p.Title, p.Description, p.Content, p.ID)
	if err != nil {
		return fmt.Errorf("failed to update policy: %w", err)
	}
	return nil
}

// GetPolicyByID retrieves a single policy
func (r *Repository) GetPolicyByID(ctx context.Context, id string) (*models.Policy, error) {
	var p models.Policy
	err := r.db.Pool.QueryRow(ctx, `
		SELECT id, workspace_id, title, description, content, status, current_version, created_at, updated_at
		FROM policies
		WHERE id = $1;
	`, id).Scan(&p.ID, &p.WorkspaceID, &p.Title, &p.Description, &p.Content, &p.Status, &p.CurrentVersion, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("policy not found: %w", err)
		}
		return nil, fmt.Errorf("failed to get policy: %w", err)
	}
	return &p, nil
}

// PublishPolicy bumps the version and distributes pending e-signatures to employees in a transaction
func (r *Repository) PublishPolicy(ctx context.Context, policyID string) (*models.PolicyVersion, error) {
	// 1. Retrieve the policy draft
	p, err := r.GetPolicyByID(ctx, policyID)
	if err != nil {
		return nil, err
	}

	if p.Content == nil || *p.Content == "" {
		return nil, errors.New("cannot publish policy without content")
	}

	// 2. Start SQL Transaction
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin publish transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	newVersion := p.CurrentVersion + 1

	// 3. Update Policy header status and version number
	_, err = tx.Exec(ctx, `
		UPDATE policies
		SET current_version = $1, status = 'published', updated_at = CURRENT_TIMESTAMP
		WHERE id = $2;
	`, newVersion, policyID)
	if err != nil {
		return nil, fmt.Errorf("failed to update policy headers: %w", err)
	}

	// 4. Insert policy version snapshot
	var pv models.PolicyVersion
	pv.PolicyID = policyID
	pv.VersionNumber = newVersion
	pv.Content = *p.Content

	err = tx.QueryRow(ctx, `
		INSERT INTO policy_versions (policy_id, version_number, content)
		VALUES ($1, $2, $3)
		RETURNING id, published_at;
	`, policyID, newVersion, *p.Content).Scan(&pv.ID, &pv.PublishedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to save policy version snapshot: %w", err)
	}

	// 5. Query active workspace members
	rows, err := tx.Query(ctx, `
		SELECT user_id FROM workspace_members
		WHERE workspace_id = $1;
	`, p.WorkspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query workspace members: %w", err)
	}
	defer rows.Close()

	var userIDs []string
	for rows.Next() {
		var uid string
		if err := rows.Scan(&uid); err == nil {
			userIDs = append(userIDs, uid)
		}
	}

	// 6. Insert pending acknowledgments for all workspace members
	for _, uid := range userIDs {
		_, err = tx.Exec(ctx, `
			INSERT INTO policy_acknowledgments (policy_version_id, user_id, status)
			VALUES ($1, $2, 'pending')
			ON CONFLICT (policy_version_id, user_id) DO NOTHING;
		`, pv.ID, uid)
		if err != nil {
			return nil, fmt.Errorf("failed to insert acknowledgment for user %s: %w", uid, err)
		}
	}

	// 7. Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit publish transaction: %w", err)
	}

	return &pv, nil
}

// GetPendingSignatures returns pending policy acknowledgments for a user
func (r *Repository) GetPendingSignatures(ctx context.Context, workspaceID string, userID string) ([]models.PolicyAcknowledgment, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT pa.id, pa.policy_version_id, pa.user_id, pa.status, pa.signed_at, pa.ip_address,
		       p.title as policy_title, pv.version_number, pv.content as policy_content
		FROM policy_acknowledgments pa
		JOIN policy_versions pv ON pa.policy_version_id = pv.id
		JOIN policies p ON pv.policy_id = p.id
		WHERE pa.user_id = $1 AND pa.status = 'pending' AND p.workspace_id = $2;
	`, userID, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query pending signatures: %w", err)
	}
	defer rows.Close()

	var acks []models.PolicyAcknowledgment
	for rows.Next() {
		var pa models.PolicyAcknowledgment
		err := rows.Scan(
			&pa.ID, &pa.PolicyVersionID, &pa.UserID, &pa.Status, &pa.SignedAt, &pa.IPAddress,
			&pa.PolicyTitle, &pa.VersionNumber, &pa.PolicyContent,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan pending acknowledgment: %w", err)
		}
		acks = append(acks, pa)
	}

	return acks, nil
}

// AcknowledgePolicy records a signature against a version acknowledgment ID
func (r *Repository) AcknowledgePolicy(ctx context.Context, versionID string, userID string, ipAddress string) (*models.PolicyAcknowledgment, error) {
	var pa models.PolicyAcknowledgment
	err := r.db.Pool.QueryRow(ctx, `
		UPDATE policy_acknowledgments
		SET status = 'signed', signed_at = CURRENT_TIMESTAMP, ip_address = $1
		WHERE policy_version_id = $2 AND user_id = $3 AND status = 'pending'
		RETURNING id, policy_version_id, user_id, status, signed_at, ip_address;
	`, ipAddress, versionID, userID).Scan(&pa.ID, &pa.PolicyVersionID, &pa.UserID, &pa.Status, &pa.SignedAt, &pa.IPAddress)
	if err != nil {
		return nil, fmt.Errorf("failed to update acknowledgment signature: %w", err)
	}
	return &pa, nil
}

// GetPolicyTracking outputs user signature metrics for the current published version
func (r *Repository) GetPolicyTracking(ctx context.Context, workspaceID string, policyID string) ([]models.PolicyTrackingRow, error) {
	// 1. Locate current published version
	var versionID string
	var versionNum int
	err := r.db.Pool.QueryRow(ctx, `
		SELECT id, version_number FROM policy_versions
		WHERE policy_id = $1
		ORDER BY version_number DESC LIMIT 1;
	`, policyID).Scan(&versionID, &versionNum)
	
	// If no version has been published yet, return empty list
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return []models.PolicyTrackingRow{}, nil
		}
		return nil, fmt.Errorf("failed to get active version: %w", err)
	}

	// 2. Query all workspace members with their signing status for that version
	rows, err := r.db.Pool.Query(ctx, `
		SELECT u.id as user_id, u.email as user_email, r.name as role_name,
		       COALESCE(pa.status, 'pending') as status, pa.signed_at, pa.ip_address
		FROM workspace_members wm
		JOIN users u ON wm.user_id = u.id
		JOIN roles r ON wm.role_id = r.id
		LEFT JOIN policy_acknowledgments pa ON pa.user_id = u.id AND pa.policy_version_id = $1
		WHERE wm.workspace_id = $2
		ORDER BY u.email ASC;
	`, versionID, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query tracking rows: %w", err)
	}
	defer rows.Close()

	var tracking []models.PolicyTrackingRow
	for rows.Next() {
		var t models.PolicyTrackingRow
		t.VersionNumber = versionNum
		err := rows.Scan(&t.UserID, &t.UserEmail, &t.RoleName, &t.Status, &t.SignedAt, &t.IPAddress)
		if err != nil {
			return nil, fmt.Errorf("failed to scan tracking row: %w", err)
		}
		tracking = append(tracking, t)
	}

	return tracking, nil
}
