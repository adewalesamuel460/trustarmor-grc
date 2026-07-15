package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/jackc/pgx/v5"
)



// GetAutomatedTestByControlID retrieves automated test logic
func (r *Repository) GetAutomatedTestByControlID(ctx context.Context, controlID string) (*models.AutomatedTest, error) {
	var t models.AutomatedTest
	err := r.db.Pool.QueryRow(ctx, `
		SELECT id, control_id, integration_provider_id, query_logic, created_at
		FROM automated_tests
		WHERE control_id = $1;
	`, controlID).Scan(&t.ID, &t.ControlID, &t.IntegrationProviderID, &t.QueryLogic, &t.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("automated test rule not found: %w", err)
		}
		return nil, fmt.Errorf("failed to get automated test rule: %w", err)
	}
	return &t, nil
}

// InsertEvidence adds an evidence record
func (r *Repository) InsertEvidence(ctx context.Context, ev *models.Evidence) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO evidence (control_id, workspace_id, type, file_url, payload, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, collected_at;
	`, ev.ControlID, ev.WorkspaceID, ev.Type, ev.FileURL, ev.Payload, ev.ExpiresAt).Scan(&ev.ID, &ev.CollectedAt)
	if err != nil {
		return fmt.Errorf("failed to insert evidence: %w", err)
	}
	return nil
}

// GetEvidenceList lists evidence history for a control
func (r *Repository) GetEvidenceList(ctx context.Context, controlID string) ([]models.Evidence, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, control_id, workspace_id, type, file_url, payload, collected_at, expires_at
		FROM evidence
		WHERE control_id = $1
		ORDER BY collected_at DESC;
	`, controlID)
	if err != nil {
		return nil, fmt.Errorf("failed to query evidence: %w", err)
	}
	defer rows.Close()

	var evidence []models.Evidence
	for rows.Next() {
		var ev models.Evidence
		err := rows.Scan(&ev.ID, &ev.ControlID, &ev.WorkspaceID, &ev.Type, &ev.FileURL, &ev.Payload, &ev.CollectedAt, &ev.ExpiresAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan evidence: %w", err)
		}
		evidence = append(evidence, ev)
	}

	return evidence, nil
}

// UpdateControlStatus updates control health
func (r *Repository) UpdateControlStatus(ctx context.Context, controlID string, status string, lastTestedAt time.Time) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE controls
		SET current_status = $1, last_tested_at = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3;
	`, status, lastTestedAt, controlID)
	if err != nil {
		return fmt.Errorf("failed to update control status: %w", err)
	}
	return nil
}

// CreateControlStatusLog adds transition logs
func (r *Repository) CreateControlStatusLog(ctx context.Context, log *models.ControlStatusLog) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO control_status_logs (control_id, previous_status, new_status, reason)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at;
	`, log.ControlID, log.PreviousStatus, log.NewStatus, log.Reason).Scan(&log.ID, &log.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert status log: %w", err)
	}
	return nil
}

// GetControlStatusLogs retrieves transition logs
func (r *Repository) GetControlStatusLogs(ctx context.Context, controlID string) ([]models.ControlStatusLog, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, control_id, previous_status, new_status, reason, created_at
		FROM control_status_logs
		WHERE control_id = $1
		ORDER BY created_at DESC;
	`, controlID)
	if err != nil {
		return nil, fmt.Errorf("failed to query status logs: %w", err)
	}
	defer rows.Close()

	var logs []models.ControlStatusLog
	for rows.Next() {
		var l models.ControlStatusLog
		err := rows.Scan(&l.ID, &l.ControlID, &l.PreviousStatus, &l.NewStatus, &l.Reason, &l.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan status log: %w", err)
		}
		logs = append(logs, l)
	}

	return logs, nil
}
