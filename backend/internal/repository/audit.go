package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
)

type AuditFilter struct {
	Action     string
	ActorEmail string
	StartDate  *time.Time
	EndDate    *time.Time
}

func (r *Repository) CreateAuditLog(ctx context.Context, log models.AuditLog) error {
	query := `
		INSERT INTO audit_logs (workspace_id, actor_id, actor_email, action, resource_type, resource_id, old_value, new_value, ip_address)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`
	_, err := r.db.Pool.Exec(ctx, query,
		log.WorkspaceID,
		log.ActorID,
		log.ActorEmail,
		log.Action,
		log.ResourceType,
		log.ResourceID,
		log.OldValue,
		log.NewValue,
		log.IPAddress,
	)
	if err != nil {
		return fmt.Errorf("failed to insert audit log: %w", err)
	}
	return nil
}

func (r *Repository) GetAuditLogs(ctx context.Context, workspaceID string, filters AuditFilter, limit, offset int) ([]models.AuditLog, error) {
	query := `
		SELECT id, workspace_id, actor_id, actor_email, action, resource_type, resource_id, old_value, new_value, ip_address, created_at
		FROM audit_logs
		WHERE workspace_id = $1`
	
	args := []interface{}{workspaceID}
	placeholderIndex := 2

	if filters.Action != "" {
		query += fmt.Sprintf(" AND action = $%d", placeholderIndex)
		args = append(args, filters.Action)
		placeholderIndex++
	}

	if filters.ActorEmail != "" {
		query += fmt.Sprintf(" AND actor_email = $%d", placeholderIndex)
		args = append(args, filters.ActorEmail)
		placeholderIndex++
	}

	if filters.StartDate != nil {
		query += fmt.Sprintf(" AND created_at >= $%d", placeholderIndex)
		args = append(args, *filters.StartDate)
		placeholderIndex++
	}

	if filters.EndDate != nil {
		query += fmt.Sprintf(" AND created_at <= $%d", placeholderIndex)
		args = append(args, *filters.EndDate)
		placeholderIndex++
	}

	// Order by created_at DESC as required for fast audits
	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", placeholderIndex, placeholderIndex+1)
	args = append(args, limit, offset)

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query audit logs: %w", err)
	}
	defer rows.Close()

	var logs []models.AuditLog
	for rows.Next() {
		var log models.AuditLog
		err := rows.Scan(
			&log.ID,
			&log.WorkspaceID,
			&log.ActorID,
			&log.ActorEmail,
			&log.Action,
			&log.ResourceType,
			&log.ResourceID,
			&log.OldValue,
			&log.NewValue,
			&log.IPAddress,
			&log.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan audit log row: %w", err)
		}
		logs = append(logs, log)
	}
	return logs, nil
}

func (r *Repository) CountAuditLogs(ctx context.Context, workspaceID string, filters AuditFilter) (int, error) {
	query := `SELECT COUNT(*) FROM audit_logs WHERE workspace_id = $1`
	args := []interface{}{workspaceID}
	placeholderIndex := 2

	if filters.Action != "" {
		query += fmt.Sprintf(" AND action = $%d", placeholderIndex)
		args = append(args, filters.Action)
		placeholderIndex++
	}

	if filters.ActorEmail != "" {
		query += fmt.Sprintf(" AND actor_email = $%d", placeholderIndex)
		args = append(args, filters.ActorEmail)
		placeholderIndex++
	}

	if filters.StartDate != nil {
		query += fmt.Sprintf(" AND created_at >= $%d", placeholderIndex)
		args = append(args, *filters.StartDate)
		placeholderIndex++
	}

	if filters.EndDate != nil {
		query += fmt.Sprintf(" AND created_at <= $%d", placeholderIndex)
		args = append(args, *filters.EndDate)
		placeholderIndex++
	}

	var count int
	err := r.db.Pool.QueryRow(ctx, query, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count audit logs: %w", err)
	}
	return count, nil
}
