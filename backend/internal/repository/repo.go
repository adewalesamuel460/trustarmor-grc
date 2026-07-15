package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/db"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/jackc/pgx/v5"
)

type Repository struct {
	db *db.DB
}

func New(database *db.DB) *Repository {
	return &Repository{db: database}
}

func (r *Repository) CreateOrganization(ctx context.Context, name string) (models.Organization, error) {
	var org models.Organization
	query := `INSERT INTO organizations (name) VALUES ($1) RETURNING id, name, created_at`
	err := r.db.Pool.QueryRow(ctx, query, name).Scan(&org.ID, &org.Name, &org.CreatedAt)
	if err != nil {
		return org, fmt.Errorf("failed to create organization: %w", err)
	}
	return org, nil
}

func (r *Repository) CreateWorkspace(ctx context.Context, orgID string, name string) (models.Workspace, error) {
	var ws models.Workspace
	query := `INSERT INTO workspaces (organization_id, name) VALUES ($1, $2) RETURNING id, organization_id, name, created_at`
	err := r.db.Pool.QueryRow(ctx, query, orgID, name).Scan(&ws.ID, &ws.OrganizationID, &ws.Name, &ws.CreatedAt)
	if err != nil {
		return ws, fmt.Errorf("failed to create workspace: %w", err)
	}
	return ws, nil
}

func (r *Repository) CreateUser(ctx context.Context, email string, passwordHash string) (models.User, error) {
	var user models.User
	query := `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, mfa_enabled, created_at`
	err := r.db.Pool.QueryRow(ctx, query, email, passwordHash).Scan(&user.ID, &user.Email, &user.MFAEnabled, &user.CreatedAt)
	if err != nil {
		return user, fmt.Errorf("failed to create user: %w", err)
	}
	return user, nil
}

func (r *Repository) GetUserByEmail(ctx context.Context, email string) (models.User, error) {
	var user models.User
	query := `SELECT id, email, password_hash, mfa_secret, mfa_enabled, created_at FROM users WHERE email = $1`
	err := r.db.Pool.QueryRow(ctx, query, email).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.MFASecret, &user.MFAEnabled, &user.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return user, fmt.Errorf("user not found: %w", err)
		}
		return user, fmt.Errorf("failed to get user by email: %w", err)
	}
	return user, nil
}

func (r *Repository) GetUserByID(ctx context.Context, id string) (models.User, error) {
	var user models.User
	query := `SELECT id, email, mfa_enabled, created_at FROM users WHERE id = $1`
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(&user.ID, &user.Email, &user.MFAEnabled, &user.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return user, fmt.Errorf("user not found: %w", err)
		}
		return user, fmt.Errorf("failed to get user by id: %w", err)
	}
	return user, nil
}

func (r *Repository) UpdateUserMFA(ctx context.Context, userID string, secret string, enabled bool) error {
	query := `UPDATE users SET mfa_secret = $1, mfa_enabled = $2 WHERE id = $3`
	_, err := r.db.Pool.Exec(ctx, query, secret, enabled, userID)
	if err != nil {
		return fmt.Errorf("failed to update user MFA settings: %w", err)
	}
	return nil
}

func (r *Repository) GetUserMFASecret(ctx context.Context, userID string) (string, error) {
	var secret string
	query := `SELECT mfa_secret FROM users WHERE id = $1`
	err := r.db.Pool.QueryRow(ctx, query, userID).Scan(&secret)
	if err != nil {
		return "", fmt.Errorf("failed to get user MFA secret: %w", err)
	}
	return secret, nil
}

func (r *Repository) GetRoleByName(ctx context.Context, name string) (models.Role, error) {
	var role models.Role
	query := `SELECT id, name, permissions FROM roles WHERE name = $1`
	err := r.db.Pool.QueryRow(ctx, query, name).Scan(&role.ID, &role.Name, &role.Permissions)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return role, fmt.Errorf("role not found: %w", err)
		}
		return role, fmt.Errorf("failed to get role by name: %w", err)
	}
	return role, nil
}

func (r *Repository) GetRoleByID(ctx context.Context, id int) (models.Role, error) {
	var role models.Role
	query := `SELECT id, name, permissions FROM roles WHERE id = $1`
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(&role.ID, &role.Name, &role.Permissions)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return role, fmt.Errorf("role not found: %w", err)
		}
		return role, fmt.Errorf("failed to get role by id: %w", err)
	}
	return role, nil
}

func (r *Repository) AddWorkspaceMember(ctx context.Context, workspaceID string, userID string, roleID int) error {
	query := `INSERT INTO workspace_members (workspace_id, user_id, role_id) VALUES ($1, $2, $3) ON CONFLICT (workspace_id, user_id) DO UPDATE SET role_id = EXCLUDED.role_id`
	_, err := r.db.Pool.Exec(ctx, query, workspaceID, userID, roleID)
	if err != nil {
		return fmt.Errorf("failed to add workspace member: %w", err)
	}
	return nil
}

func (r *Repository) GetWorkspaceMembers(ctx context.Context, workspaceID string) ([]models.WorkspaceMember, error) {
	query := `
		SELECT wm.workspace_id, wm.user_id, wm.role_id, r.name as role_name, wm.created_at 
		FROM workspace_members wm
		JOIN roles r ON wm.role_id = r.id
		WHERE wm.workspace_id = $1`
	rows, err := r.db.Pool.Query(ctx, query, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query workspace members: %w", err)
	}
	defer rows.Close()

	var members []models.WorkspaceMember
	for rows.Next() {
		var wm models.WorkspaceMember
		if err := rows.Scan(&wm.WorkspaceID, &wm.UserID, &wm.RoleID, &wm.RoleName, &wm.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan workspace member row: %w", err)
		}
		members = append(members, wm)
	}
	return members, nil
}

func (r *Repository) GetUserWorkspaces(ctx context.Context, userID string) ([]models.Workspace, error) {
	query := `
		SELECT w.id, w.organization_id, w.name, w.created_at
		FROM workspaces w
		JOIN workspace_members wm ON w.id = wm.workspace_id
		WHERE wm.user_id = $1`
	rows, err := r.db.Pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query user workspaces: %w", err)
	}
	defer rows.Close()

	var workspaces []models.Workspace
	for rows.Next() {
		var ws models.Workspace
		if err := rows.Scan(&ws.ID, &ws.OrganizationID, &ws.Name, &ws.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan workspace row: %w", err)
		}
		workspaces = append(workspaces, ws)
	}
	return workspaces, nil
}

func (r *Repository) GetWorkspaceMember(ctx context.Context, workspaceID string, userID string) (models.WorkspaceMember, error) {
	var wm models.WorkspaceMember
	query := `
		SELECT wm.workspace_id, wm.user_id, wm.role_id, r.name as role_name, wm.created_at 
		FROM workspace_members wm
		JOIN roles r ON wm.role_id = r.id
		WHERE wm.workspace_id = $1 AND wm.user_id = $2`
	err := r.db.Pool.QueryRow(ctx, query, workspaceID, userID).Scan(&wm.WorkspaceID, &wm.UserID, &wm.RoleID, &wm.RoleName, &wm.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return wm, fmt.Errorf("membership not found: %w", err)
		}
		return wm, fmt.Errorf("failed to get workspace member: %w", err)
	}
	return wm, nil
}
