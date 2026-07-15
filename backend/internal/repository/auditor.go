package repository

import (
	"context"
	"fmt"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
)

// CreateAuditRun inserts a new audit event
func (r *Repository) CreateAuditRun(ctx context.Context, run *models.AuditRun) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO audit_runs (workspace_id, name, framework_id, auditor_firm, start_date, end_date, status)
		VALUES ($1, $2, $3, $4, 
			NULLIF($5, '')::date, 
			NULLIF($6, '')::date, 
			COALESCE(NULLIF($7, ''), 'planned'))
		RETURNING id, created_at, updated_at;
	`, run.WorkspaceID, run.Name, run.FrameworkID, run.AuditorFirm, run.StartDate, run.EndDate, run.Status).Scan(&run.ID, &run.CreatedAt, &run.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create audit run: %w", err)
	}
	return nil
}

// ListAuditRuns returns all runs for a workspace
func (r *Repository) ListAuditRuns(ctx context.Context, workspaceID string) ([]models.AuditRun, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT ar.id, ar.workspace_id, ar.name, ar.framework_id, ar.auditor_firm, 
			COALESCE(ar.start_date::text, ''), COALESCE(ar.end_date::text, ''), 
			ar.status, ar.created_at, ar.updated_at,
			f.name as framework_name
		FROM audit_runs ar
		JOIN frameworks f ON ar.framework_id = f.id
		WHERE ar.workspace_id = $1
		ORDER BY ar.created_at DESC;
	`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query audit runs: %w", err)
	}
	defer rows.Close()

	var runs []models.AuditRun
	for rows.Next() {
		var run models.AuditRun
		err := rows.Scan(
			&run.ID, &run.WorkspaceID, &run.Name, &run.FrameworkID, &run.AuditorFirm,
			&run.StartDate, &run.EndDate, &run.Status, &run.CreatedAt, &run.UpdatedAt,
			&run.FrameworkName,
		)
		if err == nil {
			runs = append(runs, run)
		}
	}
	return runs, nil
}

// ListAuditorRuns returns runs assigned to an external auditor
func (r *Repository) ListAuditorRuns(ctx context.Context, workspaceID string, userID string) ([]models.AuditRun, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT ar.id, ar.workspace_id, ar.name, ar.framework_id, ar.auditor_firm, 
			COALESCE(ar.start_date::text, ''), COALESCE(ar.end_date::text, ''), 
			ar.status, ar.created_at, ar.updated_at,
			f.name as framework_name
		FROM audit_runs ar
		JOIN frameworks f ON ar.framework_id = f.id
		JOIN audit_run_auditors ara ON ar.id = ara.audit_run_id
		WHERE ar.workspace_id = $1 AND ara.user_id = $2
		ORDER BY ar.created_at DESC;
	`, workspaceID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query auditor runs: %w", err)
	}
	defer rows.Close()

	var runs []models.AuditRun
	for rows.Next() {
		var run models.AuditRun
		err := rows.Scan(
			&run.ID, &run.WorkspaceID, &run.Name, &run.FrameworkID, &run.AuditorFirm,
			&run.StartDate, &run.EndDate, &run.Status, &run.CreatedAt, &run.UpdatedAt,
			&run.FrameworkName,
		)
		if err == nil {
			runs = append(runs, run)
		}
	}
	return runs, nil
}

// IsAuditorAssignedToRun verifies mapping scoping
func (r *Repository) IsAuditorAssignedToRun(ctx context.Context, runID string, userID string) (bool, error) {
	var exists bool
	err := r.db.Pool.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM audit_run_auditors WHERE audit_run_id = $1 AND user_id = $2)
	`, runID).Scan(&exists)
	return exists, err
}

// GetAuditRun retrieves a single run details
func (r *Repository) GetAuditRun(ctx context.Context, id string) (*models.AuditRun, error) {
	var run models.AuditRun
	err := r.db.Pool.QueryRow(ctx, `
		SELECT ar.id, ar.workspace_id, ar.name, ar.framework_id, ar.auditor_firm, 
			COALESCE(ar.start_date::text, ''), COALESCE(ar.end_date::text, ''), 
			ar.status, ar.created_at, ar.updated_at,
			f.name as framework_name
		FROM audit_runs ar
		JOIN frameworks f ON ar.framework_id = f.id
		WHERE ar.id = $1;
	`, id).Scan(
		&run.ID, &run.WorkspaceID, &run.Name, &run.FrameworkID, &run.AuditorFirm,
		&run.StartDate, &run.EndDate, &run.Status, &run.CreatedAt, &run.UpdatedAt,
		&run.FrameworkName,
	)
	if err != nil {
		return nil, err
	}
	return &run, nil
}

// AddAuditorToRun maps a user to an audit
func (r *Repository) AddAuditorToRun(ctx context.Context, runID string, userID string) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO audit_run_auditors (audit_run_id, user_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING;
	`, runID, userID)
	return err
}

// GetAuditRunAuditors returns users assigned as auditors
func (r *Repository) GetAuditRunAuditors(ctx context.Context, runID string) ([]models.User, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT u.id, u.email, u.created_at
		FROM users u
		JOIN audit_run_auditors ara ON u.id = ara.user_id
		WHERE ara.audit_run_id = $1
		ORDER BY u.email ASC;
	`, runID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		err := rows.Scan(&u.ID, &u.Email, &u.CreatedAt)
		if err == nil {
			users = append(users, u)
		}
	}
	return users, nil
}

// GetAuditRunProgress queries request totals and progress percent
func (r *Repository) GetAuditRunProgress(ctx context.Context, runID string) (int, float64, error) {
	var total int
	var acceptedPct float64
	err := r.db.Pool.QueryRow(ctx, `
		SELECT 
			COUNT(*) as total_requests,
			COALESCE(SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) * 100, 0.0) as accepted_pct
		FROM evidence_requests
		WHERE audit_run_id = $1;
	`, runID).Scan(&total, &acceptedPct)
	return total, acceptedPct, err
}

// GetEvidenceRequests lists requests mapped to an audit
func (r *Repository) GetEvidenceRequests(ctx context.Context, runID string) ([]models.EvidenceRequest, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT 
			er.id, er.audit_run_id, er.control_id, er.title, er.description, er.status, er.linked_evidence_id, er.created_at, er.updated_at,
			c.name as control_name, c.description as control_desc,
			ev.file_url
		FROM evidence_requests er
		JOIN controls c ON er.control_id = c.id
		LEFT JOIN evidence ev ON er.linked_evidence_id = ev.id
		WHERE er.audit_run_id = $1
		ORDER BY er.created_at DESC;
	`, runID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []models.EvidenceRequest
	for rows.Next() {
		var req models.EvidenceRequest
		err := rows.Scan(
			&req.ID, &req.AuditRunID, &req.ControlID, &req.Title, &req.Description, &req.Status,
			&req.LinkedEvidenceID, &req.CreatedAt, &req.UpdatedAt,
			&req.ControlName, &req.ControlDesc, &req.LinkedFileUrl,
		)
		if err == nil {
			requests = append(requests, req)
		}
	}
	return requests, nil
}

// CreateEvidenceRequest logs a new ticketing requirement
func (r *Repository) CreateEvidenceRequest(ctx context.Context, req *models.EvidenceRequest) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO evidence_requests (audit_run_id, control_id, title, description, status)
		VALUES ($1, $2, $3, $4, 'open')
		RETURNING id, created_at, updated_at;
	`, req.AuditRunID, req.ControlID, req.Title, req.Description).Scan(&req.ID, &req.CreatedAt, &req.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create evidence request ticket: %w", err)
	}
	req.Status = "open"
	return nil
}

// SubmitEvidence maps internal evidence ID to the ticket
func (r *Repository) SubmitEvidence(ctx context.Context, reqID string, evidenceID string) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE evidence_requests
		SET linked_evidence_id = $1, status = 'submitted', updated_at = CURRENT_TIMESTAMP
		WHERE id = $2;
	`, evidenceID, reqID)
	return err
}

// ReviewEvidenceRequest updates evaluation status
func (r *Repository) ReviewEvidenceRequest(ctx context.Context, reqID string, status string) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE evidence_requests
		SET status = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2;
	`, status, reqID)
	return err
}

// AddAuditComment appends a chat node
func (r *Repository) AddAuditComment(ctx context.Context, ac *models.AuditComment) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO audit_comments (evidence_request_id, user_id, comment)
		VALUES ($1, $2, $3)
		RETURNING id, created_at;
	`, ac.EvidenceRequestID, ac.UserID, ac.Comment).Scan(&ac.ID, &ac.CreatedAt)
	return err
}

// GetAuditComments retrieves chat history for a request
func (r *Repository) GetAuditComments(ctx context.Context, requestID string) ([]models.AuditComment, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT 
			ac.id, ac.evidence_request_id, ac.user_id, ac.comment, ac.created_at,
			u.email, COALESCE(ro.name, '') as role_name
		FROM audit_comments ac
		JOIN users u ON ac.user_id = u.id
		LEFT JOIN evidence_requests er ON ac.evidence_request_id = er.id
		LEFT JOIN audit_runs ar ON er.audit_run_id = ar.id
		LEFT JOIN workspace_members wm ON wm.user_id = u.id AND wm.workspace_id = ar.workspace_id
		LEFT JOIN roles ro ON wm.role_id = ro.id
		WHERE ac.evidence_request_id = $1
		ORDER BY ac.created_at ASC;
	`, requestID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.AuditComment
	for rows.Next() {
		var comment models.AuditComment
		err := rows.Scan(
			&comment.ID, &comment.EvidenceRequestID, &comment.UserID, &comment.Comment, &comment.CreatedAt,
			&comment.UserEmail, &comment.UserRole,
		)
		if err == nil {
			list = append(list, comment)
		}
	}
	return list, nil
}

// GetFrameworkControls returns controls mapped to a framework's requirements
func (r *Repository) GetFrameworkControls(ctx context.Context, frameworkID string, workspaceID string) ([]models.Control, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT DISTINCT c.id, c.workspace_id, c.title, c.description, c.type, c.frequency, c.current_status, c.created_at, c.updated_at
		FROM controls c
		JOIN control_mappings cm ON c.id = cm.control_id
		JOIN framework_requirements fr ON cm.requirement_id = fr.id
		WHERE fr.framework_id = $1 AND c.workspace_id = $2;
	`, frameworkID, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var controls []models.Control
	for rows.Next() {
		var c models.Control
		err := rows.Scan(
			&c.ID, &c.WorkspaceID, &c.Title, &c.Description, &c.Type, &c.Frequency, &c.CurrentStatus, &c.CreatedAt, &c.UpdatedAt,
		)
		if err == nil {
			controls = append(controls, c)
		}
	}
	return controls, nil
}
