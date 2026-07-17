package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
)

// IsGlobalAdmin checks if a user has platform admin privileges
func (r *Repository) IsGlobalAdmin(ctx context.Context, userID string) (bool, error) {
	var exists bool
	err := r.db.Pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM global_admins WHERE user_id = $1
		);
	`, userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check global admin status: %w", err)
	}
	return exists, nil
}

// GetGlobalAdminByUserID retrieves administrative info for a user
func (r *Repository) GetGlobalAdminByUserID(ctx context.Context, userID string) (*models.GlobalAdmin, error) {
	var adm models.GlobalAdmin
	err := r.db.Pool.QueryRow(ctx, `
		SELECT id, user_id, role, created_at
		FROM global_admins
		WHERE user_id = $1;
	`, userID).Scan(&adm.ID, &adm.UserID, &adm.Role, &adm.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch global admin profile: %w", err)
	}
	return &adm, nil
}

// ListTenants gathers list of organizations, subscription details, and counts for workspaces, users, and integrations
func (r *Repository) ListTenants(ctx context.Context) ([]map[string]any, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT 
			o.id, 
			o.name, 
			o.subscription_tier, 
			o.status, 
			o.created_at,
			COUNT(DISTINCT w.id) as workspace_count,
			COUNT(DISTINCT wm.user_id) as user_count,
			COUNT(DISTINCT wi.id) as integration_count
		FROM organizations o
		LEFT JOIN workspaces w ON o.id = w.organization_id
		LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
		LEFT JOIN workspace_integrations wi ON w.id = wi.workspace_id
		GROUP BY o.id, o.name, o.subscription_tier, o.status, o.created_at
		ORDER BY o.created_at DESC;
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query platform tenants: %w", err)
	}
	defer rows.Close()

	var list []map[string]any
	for rows.Next() {
		var id, name, subTier, status string
		var createdAt time.Time
		var wsCount, userCount, intCount int64

		err := rows.Scan(&id, &name, &subTier, &status, &createdAt, &wsCount, &userCount, &intCount)
		if err != nil {
			return nil, fmt.Errorf("failed to scan tenant details: %w", err)
		}

		list = append(list, map[string]any{
			"id":                id,
			"name":              name,
			"subscription_tier": subTier,
			"status":            status,
			"created_at":        createdAt,
			"workspace_count":   wsCount,
			"user_count":        userCount,
			"integration_count": intCount,
		})
	}
	return list, nil
}

// UpdateTenantStatus updates status of a tenant (e.g. suspended, active)
func (r *Repository) UpdateTenantStatus(ctx context.Context, orgID string, status string) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE organizations
		SET status = $1
		WHERE id = $2;
	`, status, orgID)
	if err != nil {
		return fmt.Errorf("failed to update tenant status: %w", err)
	}
	return nil
}

// CreateGlobalAuditLog records admin activities (impersonations, suspensions)
func (r *Repository) CreateGlobalAuditLog(ctx context.Context, log *models.GlobalAuditLog) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO global_audit_logs (global_admin_id, target_organization_id, target_workspace_id, action, details, ip_address)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at;
	`, log.GlobalAdminID, log.TargetOrganizationID, log.TargetWorkspaceID, log.Action, log.Details, log.IPAddress).Scan(&log.ID, &log.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to log global admin action: %w", err)
	}
	return nil
}

// GetGlobalAuditLogs retrieves chronological history of admin portal operations
func (r *Repository) GetGlobalAuditLogs(ctx context.Context) ([]models.GlobalAuditLog, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT gal.id, gal.global_admin_id, u.email as admin_email, gal.target_organization_id, 
		       COALESCE(o.name, '') as target_org_name, gal.target_workspace_id, COALESCE(w.name, '') as target_workspace_name, 
		       gal.action, gal.details, COALESCE(gal.ip_address, '') as ip_address, gal.created_at
		FROM global_audit_logs gal
		JOIN global_admins ga ON gal.global_admin_id = ga.id
		JOIN users u ON ga.user_id = u.id
		LEFT JOIN organizations o ON gal.target_organization_id = o.id
		LEFT JOIN workspaces w ON gal.target_workspace_id = w.id
		ORDER BY gal.created_at DESC;
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query global admin logs: %w", err)
	}
	defer rows.Close()

	var list []models.GlobalAuditLog
	for rows.Next() {
		var l models.GlobalAuditLog
		err := rows.Scan(
			&l.ID, &l.GlobalAdminID, &l.AdminEmail, &l.TargetOrganizationID,
			&l.TargetOrgName, &l.TargetWorkspaceID, &l.TargetWorkspaceName,
			&l.Action, &l.Details, &l.IPAddress, &l.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan global audit log: %w", err)
		}
		list = append(list, l)
	}
	return list, nil
}

// CreateGlobalFramework creates a new compliance standard globally
func (r *Repository) CreateGlobalFramework(ctx context.Context, f *models.Framework) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO frameworks (name, version, description)
		VALUES ($1, $2, $3)
		RETURNING id, created_at;
	`, f.Name, f.Version, f.Description).Scan(&f.ID, &f.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create global framework: %w", err)
	}
	return nil
}

// CreateGlobalRequirement links a core requirement to a global framework
func (r *Repository) CreateGlobalRequirement(ctx context.Context, req *models.Requirement) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO framework_requirements (framework_id, identifier, title, description)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at;
	`, req.FrameworkID, req.Identifier, req.Title, req.Description).Scan(&req.ID, &req.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert framework requirement: %w", err)
	}
	return nil
}

// GetTenantUsers lists all users associated with workspaces in a tenant organization
func (r *Repository) GetTenantUsers(ctx context.Context, orgID string) ([]models.User, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT DISTINCT u.id, u.email, u.created_at
		FROM users u
		JOIN workspace_members wm ON u.id = wm.user_id
		JOIN workspaces w ON wm.workspace_id = w.id
		WHERE w.organization_id = $1
		ORDER BY u.email ASC;
	`, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to query tenant users: %w", err)
	}
	defer rows.Close()

	var list []models.User
	for rows.Next() {
		var u models.User
		err := rows.Scan(&u.ID, &u.Email, &u.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan tenant user: %w", err)
		}
		list = append(list, u)
	}
	return list, nil
}

// GetTenantFrameworks lists frameworks activated by workspaces inside the organization
func (r *Repository) GetTenantFrameworks(ctx context.Context, orgID string) ([]models.Framework, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT DISTINCT f.id, f.name, f.version, f.description, f.created_at
		FROM frameworks f
		JOIN workspace_frameworks wf ON f.id = wf.framework_id
		JOIN workspaces w ON wf.workspace_id = w.id
		WHERE w.organization_id = $1
		ORDER BY f.name ASC;
	`, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to query tenant frameworks: %w", err)
	}
	defer rows.Close()

	var list []models.Framework
	for rows.Next() {
		var f models.Framework
		err := rows.Scan(&f.ID, &f.Name, &f.Version, &f.Description, &f.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan tenant framework: %w", err)
		}
		list = append(list, f)
	}
	return list, nil
}

// PromoteUserToAdmin inserts or updates a user in global_admins
func (r *Repository) PromoteUserToAdmin(ctx context.Context, userID string, role string) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO global_admins (user_id, role)
		VALUES ($1, $2)
		ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
	`, userID, role)
	if err != nil {
		return fmt.Errorf("failed to promote user to admin: %w", err)
	}
	return nil
}

// DemoteUserFromAdmin removes a user from global_admins
func (r *Repository) DemoteUserFromAdmin(ctx context.Context, userID string) error {
	_, err := r.db.Pool.Exec(ctx, `DELETE FROM global_admins WHERE user_id = $1`, userID)
	if err != nil {
		return fmt.Errorf("failed to demote user from admin: %w", err)
	}
	return nil
}

// ListGlobalAdmins retrieves all platform admins with their associated email
func (r *Repository) ListGlobalAdmins(ctx context.Context) ([]map[string]any, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT ga.id, ga.user_id, u.email, ga.role, ga.created_at
		FROM global_admins ga
		JOIN users u ON ga.user_id = u.id
		ORDER BY ga.created_at ASC;
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to list global admins: %w", err)
	}
	defer rows.Close()

	var list []map[string]any
	for rows.Next() {
		var id, userID, email, role string
		var createdAt time.Time
		if err := rows.Scan(&id, &userID, &email, &role, &createdAt); err != nil {
			return nil, fmt.Errorf("failed to scan admin row: %w", err)
		}
		list = append(list, map[string]any{
			"id":         id,
			"user_id":    userID,
			"email":      email,
			"role":       role,
			"created_at": createdAt,
		})
	}
	return list, nil
}
