package repository

import (
	"context"
	"fmt"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
)

// CreateAccessReviewCampaign inserts a campaign configuration
func (r *Repository) CreateAccessReviewCampaign(ctx context.Context, camp *models.AccessReviewCampaign) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO access_review_campaigns (workspace_id, name, deadline, status)
		VALUES ($1, $2, $3::date, 'draft')
		RETURNING id, created_at, updated_at;
	`, camp.WorkspaceID, camp.Name, camp.Deadline).Scan(&camp.ID, &camp.CreatedAt, &camp.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create access review campaign: %w", err)
	}
	camp.Status = "draft"
	return nil
}

// ListAccessReviewCampaigns lists campaigns and fetches completeness percentages
func (r *Repository) ListAccessReviewCampaigns(ctx context.Context, workspaceID string) ([]models.AccessReviewCampaign, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT arc.id, arc.workspace_id, arc.name, arc.status, arc.deadline::text, arc.created_at, arc.updated_at,
		       COUNT(ari.id) as total_items,
		       SUM(CASE WHEN ari.decision != 'pending' THEN 1 ELSE 0 END) as completed_items
		FROM access_review_campaigns arc
		LEFT JOIN access_review_items ari ON arc.id = ari.campaign_id
		WHERE arc.workspace_id = $1
		GROUP BY arc.id, arc.workspace_id, arc.name, arc.status, arc.deadline, arc.created_at, arc.updated_at
		ORDER BY arc.created_at DESC;
	`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to list campaigns: %w", err)
	}
	defer rows.Close()

	var campaigns []models.AccessReviewCampaign
	for rows.Next() {
		var c models.AccessReviewCampaign
		var total, completed int
		err := rows.Scan(
			&c.ID, &c.WorkspaceID, &c.Name, &c.Status, &c.Deadline, &c.CreatedAt, &c.UpdatedAt,
			&total, &completed,
		)
		if err == nil {
			c.TotalItems = total
			c.CompletedItems = completed
			campaigns = append(campaigns, c)
		}
	}
	return campaigns, nil
}

// GetAccessReviewCampaign fetches campaign detail
func (r *Repository) GetAccessReviewCampaign(ctx context.Context, id string) (*models.AccessReviewCampaign, error) {
	var c models.AccessReviewCampaign
	err := r.db.Pool.QueryRow(ctx, `
		SELECT id, workspace_id, name, status, deadline::text, created_at, updated_at
		FROM access_review_campaigns
		WHERE id = $1;
	`, id).Scan(&c.ID, &c.WorkspaceID, &c.Name, &c.Status, &c.Deadline, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// UpdateCampaignStatus sets campaign state
func (r *Repository) UpdateCampaignStatus(ctx context.Context, id string, status string) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE access_review_campaigns
		SET status = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2;
	`, status, id)
	return err
}

// CreateAccessReviewItem inserts an item
func (r *Repository) CreateAccessReviewItem(ctx context.Context, item *models.AccessReviewItem) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO access_review_items (campaign_id, account_email, system_name, reviewer_id, decision)
		VALUES ($1, $2, $3, $4, 'pending')
		ON CONFLICT (campaign_id, account_email, system_name) DO NOTHING;
	`, item.CampaignID, item.AccountEmail, item.SystemName, item.ReviewerID)
	return err
}

// ListPendingAccessReviewItems lists items assigned to reviewer
func (r *Repository) ListPendingAccessReviewItems(ctx context.Context, reviewerID string) ([]models.AccessReviewItem, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT ari.id, ari.campaign_id, ari.account_email, ari.system_name, ari.reviewer_id, ari.decision, ari.decided_at, ari.notes,
		       arc.name as campaign_name
		FROM access_review_items ari
		JOIN access_review_campaigns arc ON ari.campaign_id = arc.id
		WHERE ari.reviewer_id = $1 AND ari.decision = 'pending' AND arc.status = 'in_progress'
		ORDER BY ari.system_name ASC, ari.account_email ASC;
	`, reviewerID)
	if err != nil {
		return nil, fmt.Errorf("failed to query pending items: %w", err)
	}
	defer rows.Close()

	var list []models.AccessReviewItem
	for rows.Next() {
		var item models.AccessReviewItem
		err := rows.Scan(
			&item.ID, &item.CampaignID, &item.AccountEmail, &item.SystemName, &item.ReviewerID,
			&item.Decision, &item.DecidedAt, &item.Notes, &item.CampaignName,
		)
		if err == nil {
			list = append(list, item)
		}
	}
	return list, nil
}

// UpdateAccessReviewItemDecision saves Keep/Revoke actions
func (r *Repository) UpdateAccessReviewItemDecision(ctx context.Context, itemID string, decision string, notes string) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE access_review_items
		SET decision = $1, notes = NULLIF($2, ''), decided_at = CURRENT_TIMESTAMP
		WHERE id = $3;
	`, decision, notes, itemID)
	return err
}

// GetAccessReviewCampaignItems returns all items for evidence dump
func (r *Repository) GetAccessReviewCampaignItems(ctx context.Context, campaignID string) ([]models.AccessReviewItem, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, campaign_id, account_email, system_name, reviewer_id, decision, decided_at, notes
		FROM access_review_items
		WHERE campaign_id = $1
		ORDER BY account_email ASC;
	`, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.AccessReviewItem
	for rows.Next() {
		var item models.AccessReviewItem
		err := rows.Scan(
			&item.ID, &item.CampaignID, &item.AccountEmail, &item.SystemName, &item.ReviewerID,
			&item.Decision, &item.DecidedAt, &item.Notes,
		)
		if err == nil {
			list = append(list, item)
		}
	}
	return list, nil
}

// ListTrainingRecords returns modules logs
func (r *Repository) ListTrainingRecords(ctx context.Context, workspaceID string) ([]models.TrainingRecord, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT tr.id, tr.workspace_id, tr.user_id, tr.module_name, tr.status, tr.completed_at, tr.certificate_url, tr.created_at,
		       u.email as user_email
		FROM training_records tr
		JOIN users u ON tr.user_id = u.id
		WHERE tr.workspace_id = $1
		ORDER BY tr.created_at DESC;
	`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query training records: %w", err)
	}
	defer rows.Close()

	var list []models.TrainingRecord
	for rows.Next() {
		var tr models.TrainingRecord
		err := rows.Scan(
			&tr.ID, &tr.WorkspaceID, &tr.UserID, &tr.ModuleName, &tr.Status, &tr.CompletedAt, &tr.CertificateUrl, &tr.CreatedAt,
			&tr.UserEmail,
		)
		if err == nil {
			list = append(list, tr)
		}
	}
	return list, nil
}

// CreateTrainingRecord assigns module
func (r *Repository) CreateTrainingRecord(ctx context.Context, tr *models.TrainingRecord) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO training_records (workspace_id, user_id, module_name, status)
		VALUES ($1, $2, $3, 'assigned')
		ON CONFLICT (user_id, module_name) DO NOTHING
		RETURNING id, status, created_at;
	`, tr.WorkspaceID, tr.UserID, tr.ModuleName).Scan(&tr.ID, &tr.Status, &tr.CreatedAt)
	return err
}

// CompleteTrainingRecord saves validation certificate
func (r *Repository) CompleteTrainingRecord(ctx context.Context, id string, certURL string) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE training_records
		SET status = 'completed', completed_at = CURRENT_TIMESTAMP, certificate_url = NULLIF($1, '')
		WHERE id = $2;
	`, certURL, id)
	return err
}

// GetAccessReviewControl retrieves a control matching access reviews to map evidence to
func (r *Repository) GetAccessReviewControl(ctx context.Context, workspaceID string) (string, error) {
	var controlID string
	err := r.db.Pool.QueryRow(ctx, `
		SELECT id FROM controls 
		WHERE workspace_id = $1 AND (title ILIKE '%access%' OR title ILIKE '%review%')
		LIMIT 1;
	`, workspaceID).Scan(&controlID)
	if err != nil {
		// Fallback to any control in workspace
		err = r.db.Pool.QueryRow(ctx, `
			SELECT id FROM controls WHERE workspace_id = $1 LIMIT 1;
		`, workspaceID).Scan(&controlID)
	}
	return controlID, err
}
