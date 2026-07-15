package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
)

// CreateTask inserts a remediation task
func (r *Repository) CreateTask(ctx context.Context, t *models.Task) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO tasks (workspace_id, title, description, status, priority, assignee_id, due_date, related_entity_type, related_entity_id)
		VALUES ($1, $2, $3, COALESCE(NULLIF($4, ''), 'todo'), COALESCE(NULLIF($5, ''), 'medium'), $6, $7, $8, $9)
		RETURNING id, status, priority, created_at, updated_at;
	`, t.WorkspaceID, t.Title, t.Description, t.Status, t.Priority, t.AssigneeID, t.DueDate, t.RelatedEntityType, t.RelatedEntityID).
		Scan(&t.ID, &t.Status, &t.Priority, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create task: %w", err)
	}
	return nil
}

// ListTasks returns all tasks matching filters in the workspace
func (r *Repository) ListTasks(ctx context.Context, workspaceID string, status string, assigneeID string) ([]models.Task, error) {
	query := `
		SELECT t.id, t.workspace_id, t.title, t.description, t.status, t.priority, t.assignee_id, t.due_date, t.related_entity_type, t.related_entity_id, t.created_at, t.updated_at, t.resolved_at,
		       u.email as assignee_email
		FROM tasks t
		LEFT JOIN users u ON t.assignee_id = u.id
		WHERE t.workspace_id = $1
	`
	args := []interface{}{workspaceID}
	placeholderIdx := 2

	if status != "" {
		query += fmt.Sprintf(" AND t.status = $%d", placeholderIdx)
		args = append(args, status)
		placeholderIdx++
	}
	if assigneeID != "" {
		query += fmt.Sprintf(" AND t.assignee_id = $%d", placeholderIdx)
		args = append(args, assigneeID)
		placeholderIdx++
	}

	query += " ORDER BY t.created_at DESC"

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query tasks: %w", err)
	}
	defer rows.Close()

	var list []models.Task
	for rows.Next() {
		var t models.Task
		err := rows.Scan(
			&t.ID, &t.WorkspaceID, &t.Title, &t.Description, &t.Status, &t.Priority, &t.AssigneeID, &t.DueDate, &t.RelatedEntityType, &t.RelatedEntityID, &t.CreatedAt, &t.UpdatedAt, &t.ResolvedAt,
			&t.AssigneeEmail,
		)
		if err == nil {
			list = append(list, t)
		}
	}
	return list, nil
}

// UpdateTaskStatus saves updates and sets resolved_at if transitioning to 'done'
func (r *Repository) UpdateTaskStatus(ctx context.Context, id string, status string) error {
	var resolvedAt *time.Time
	if status == "done" {
		t := time.Now()
		resolvedAt = &t
	}

	_, err := r.db.Pool.Exec(ctx, `
		UPDATE tasks
		SET status = $1, resolved_at = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3;
	`, status, resolvedAt, id)
	return err
}

// CreateNotificationRule registers trigger alerts destination
func (r *Repository) CreateNotificationRule(ctx context.Context, nr *models.NotificationRule) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO notification_rules (workspace_id, trigger_event, action_type, target_destination, is_active)
		VALUES ($1, $2, $3, $4, COALESCE($5, TRUE))
		RETURNING id, is_active, created_at;
	`, nr.WorkspaceID, nr.TriggerEvent, nr.ActionType, nr.TargetDestination, nr.IsActive).
		Scan(&nr.ID, &nr.IsActive, &nr.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create notification rule: %w", err)
	}
	return nil
}

// ListNotificationRules lists alert routing rules
func (r *Repository) ListNotificationRules(ctx context.Context, workspaceID string) ([]models.NotificationRule, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, workspace_id, trigger_event, action_type, target_destination, is_active, created_at
		FROM notification_rules
		WHERE workspace_id = $1
		ORDER BY created_at DESC;
	`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.NotificationRule
	for rows.Next() {
		var nr models.NotificationRule
		err := rows.Scan(&nr.ID, &nr.WorkspaceID, &nr.TriggerEvent, &nr.ActionType, &nr.TargetDestination, &nr.IsActive, &nr.CreatedAt)
		if err == nil {
			list = append(list, nr)
		}
	}
	return list, nil
}

// DeleteNotificationRule removes alert configuration
func (r *Repository) DeleteNotificationRule(ctx context.Context, id string) error {
	_, err := r.db.Pool.Exec(ctx, `DELETE FROM notification_rules WHERE id = $1`, id)
	return err
}

// GetActiveRulesForEvent fetches alert routes matching trigger
func (r *Repository) GetActiveRulesForEvent(ctx context.Context, workspaceID string, triggerEvent string) ([]models.NotificationRule, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, workspace_id, trigger_event, action_type, target_destination, is_active, created_at
		FROM notification_rules
		WHERE workspace_id = $1 AND trigger_event = $2 AND is_active = TRUE;
	`, workspaceID, triggerEvent)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.NotificationRule
	for rows.Next() {
		var nr models.NotificationRule
		err := rows.Scan(&nr.ID, &nr.WorkspaceID, &nr.TriggerEvent, &nr.ActionType, &nr.TargetDestination, &nr.IsActive, &nr.CreatedAt)
		if err == nil {
			list = append(list, nr)
		}
	}
	return list, nil
}

// GetFrameworkCompliancePosture calculates overall average posture percentage
func (r *Repository) GetFrameworkCompliancePosture(ctx context.Context, workspaceID string) (float64, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT framework_id FROM workspace_frameworks WHERE workspace_id = $1 AND status = 'active';
	`, workspaceID)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	var frameworkIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err == nil {
			frameworkIDs = append(frameworkIDs, id)
		}
	}

	if len(frameworkIDs) == 0 {
		return 0.0, nil
	}

	var sum float64
	var activeCount int
	for _, fid := range frameworkIDs {
		p, err := r.GetPosture(ctx, workspaceID, fid)
		if err == nil {
			sum += p
			activeCount++
		}
	}

	if activeCount == 0 {
		return 0.0, nil
	}

	return sum / float64(activeCount), nil
}

// GetMTTRAverage calculates average remediation time in hours over last 30 days
func (r *Repository) GetMTTRAverage(ctx context.Context, workspaceID string) (float64, error) {
	var avgSeconds float64
	err := r.db.Pool.QueryRow(ctx, `
		SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))), 0) 
		FROM tasks 
		WHERE workspace_id = $1 AND status = 'done' AND resolved_at >= NOW() - INTERVAL '30 days';
	`, workspaceID).Scan(&avgSeconds)
	if err != nil {
		return 0, err
	}
	// Convert to hours
	return avgSeconds / 3600.0, nil
}

// GetExecutiveSummaryWidgets fetches stats for dashboard cards
func (r *Repository) GetExecutiveSummaryWidgets(ctx context.Context, workspaceID string) (map[string]interface{}, error) {
	var openTasks int
	_ = r.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM tasks WHERE workspace_id = $1 AND status != 'done'`, workspaceID).Scan(&openTasks)

	var failingControls int
	_ = r.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM controls WHERE workspace_id = $1 AND current_status = 'failing'`, workspaceID).Scan(&failingControls)

	var unmitigatedRisks int
	_ = r.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM risks WHERE workspace_id = $1 AND status = 'unmitigated'`, workspaceID).Scan(&unmitigatedRisks)

	return map[string]interface{}{
		"open_tasks_count":       openTasks,
		"failing_controls_count": failingControls,
		"unmitigated_risks_count": unmitigatedRisks,
	}, nil
}
