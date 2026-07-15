package models

import (
	"time"
)

type Organization struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

type Workspace struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organization_id"`
	Name           string    `json:"name"`
	CreatedAt      time.Time `json:"created_at"`
}

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	MFASecret    string    `json:"-"`
	MFAEnabled   bool      `json:"mfa_enabled"`
	CreatedAt    time.Time `json:"created_at"`
}

type Role struct {
	ID          int      `json:"id"`
	Name        string   `json:"name"`
	Permissions []string `json:"permissions"`
}

type WorkspaceMember struct {
	WorkspaceID string    `json:"workspace_id"`
	UserID      string    `json:"user_id"`
	RoleID      int       `json:"role_id"`
	RoleName    string    `json:"role_name"`
	CreatedAt   time.Time `json:"created_at"`
}

type AuditLog struct {
	ID           string      `json:"id"`
	WorkspaceID  string      `json:"workspace_id"`
	ActorID      *string     `json:"actor_id"`
	ActorEmail   *string     `json:"actor_email"`
	Action       string      `json:"action"`
	ResourceType string      `json:"resource_type"`
	ResourceID   string      `json:"resource_id"`
	OldValue     interface{} `json:"old_value"`
	NewValue     interface{} `json:"new_value"`
	IPAddress    string      `json:"ip_address"`
	CreatedAt    time.Time   `json:"created_at"`
}
