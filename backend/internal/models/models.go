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
	UserEmail   string    `json:"user_email"`
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

type Framework struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Version     string    `json:"version"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

type Requirement struct {
	ID          string    `json:"id"`
	FrameworkID string    `json:"framework_id"`
	Identifier  string    `json:"identifier"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

type WorkspaceFramework struct {
	ID          string    `json:"id"`
	WorkspaceID string    `json:"workspace_id"`
	FrameworkID string    `json:"framework_id"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

type Control struct {
	ID                 string     `json:"id"`
	WorkspaceID        string     `json:"workspace_id"`
	Title              string     `json:"title"`
	Description        string     `json:"description"`
	Type               string     `json:"type"`
	Frequency          string     `json:"frequency"`
	OwnerID            *string    `json:"owner_id"`
	CurrentStatus      string     `json:"current_status"`
	LastTestedAt       *time.Time `json:"last_tested_at"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
	MappedRequirements []string   `json:"mapped_requirements"` // e.g. ["CC6.1", "Art 2.2"]
}

type ControlMapping struct {
	ID            string    `json:"id"`
	ControlID     string    `json:"control_id"`
	RequirementID string    `json:"requirement_id"`
	CreatedAt     time.Time `json:"created_at"`
}

type IntegrationProvider struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Category  string    `json:"category"`
	AuthType  string    `json:"auth_type"`
	LogoURL   *string   `json:"logo_url"`
	CreatedAt time.Time `json:"created_at"`
}

type WorkspaceIntegration struct {
	ID                   string     `json:"id"`
	WorkspaceID          string     `json:"workspace_id"`
	ProviderID           string     `json:"provider_id"`
	Status               string     `json:"status"`
	EncryptedCredentials []byte     `json:"-"`
	LastSyncAt           *time.Time `json:"last_sync_at"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
	ProviderName         string     `json:"provider_name,omitempty"`
	ProviderCategory     string     `json:"provider_category,omitempty"`
}

type SyncLog struct {
	ID                     string    `json:"id"`
	WorkspaceIntegrationID string    `json:"workspace_integration_id"`
	Status                 string    `json:"status"`
	RecordsFetched         int       `json:"records_fetched"`
	ErrorMessage           *string   `json:"error_message"`
	StartedAt              time.Time `json:"started_at"`
	CompletedAt            time.Time `json:"completed_at"`
	DurationMs             int64     `json:"duration_ms"`
}

type AutomatedTest struct {
	ID                    string                 `json:"id"`
	ControlID             string                 `json:"control_id"`
	IntegrationProviderID string                 `json:"integration_provider_id"`
	QueryLogic            map[string]interface{} `json:"query_logic"`
	CreatedAt             time.Time              `json:"created_at"`
}

type Evidence struct {
	ID          string                 `json:"id"`
	ControlID   string                 `json:"control_id"`
	WorkspaceID string                 `json:"workspace_id"`
	Type        string                 `json:"type"` // 'automated', 'manual'
	FileURL     *string                `json:"file_url"`
	Payload     map[string]interface{} `json:"payload"`
	CollectedAt time.Time              `json:"collected_at"`
	ExpiresAt   *time.Time             `json:"expires_at"`
}

type ControlStatusLog struct {
	ID             string    `json:"id"`
	ControlID      string    `json:"control_id"`
	PreviousStatus *string   `json:"previous_status"`
	NewStatus      string    `json:"new_status"`
	Reason         *string   `json:"reason"`
	CreatedAt      time.Time `json:"created_at"`
}

type Policy struct {
	ID             string    `json:"id"`
	WorkspaceID    string    `json:"workspace_id"`
	Title          string    `json:"title"`
	Description    string    `json:"description"`
	Content        *string   `json:"content"`
	Status         string    `json:"status"`
	CurrentVersion int       `json:"current_version"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type PolicyVersion struct {
	ID            string    `json:"id"`
	PolicyID      string    `json:"policy_id"`
	VersionNumber int       `json:"version_number"`
	Content       string    `json:"content"`
	PublishedAt   time.Time `json:"published_at"`
}

type PolicyAcknowledgment struct {
	ID              string     `json:"id"`
	PolicyVersionID string     `json:"policy_version_id"`
	UserID          string     `json:"user_id"`
	Status          string     `json:"status"`
	SignedAt        *time.Time `json:"signed_at"`
	IPAddress       *string    `json:"ip_address"`
	PolicyTitle     string     `json:"policy_title,omitempty"`
	VersionNumber   int        `json:"version_number,omitempty"`
	PolicyContent   string     `json:"policy_content,omitempty"`
}

type PolicyTrackingRow struct {
	UserID        string     `json:"user_id"`
	UserEmail     string     `json:"user_email"`
	RoleName      string     `json:"role_name"`
	Status        string     `json:"status"`
	SignedAt      *time.Time `json:"signed_at"`
	IPAddress     *string    `json:"ip_address"`
	VersionNumber int        `json:"version_number"`
}

type Risk struct {
	ID            string          `json:"id"`
	WorkspaceID   string          `json:"workspace_id"`
	Title         string          `json:"title"`
	Description   string          `json:"description"`
	Category      string          `json:"category"`
	Likelihood    int             `json:"likelihood"`
	Impact        int             `json:"impact"`
	InherentScore int             `json:"inherent_score"`
	ResidualScore *int            `json:"residual_score"`
	Status        string          `json:"status"`
	OwnerID       *string         `json:"owner_id"`
	OwnerEmail    *string         `json:"owner_email,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
	Treatments    []RiskTreatment `json:"treatments"`
	ControlIDs    []string        `json:"control_ids"`
}

type RiskTreatment struct {
	ID          string     `json:"id"`
	RiskID      string     `json:"risk_id"`
	Strategy    string     `json:"strategy"`
	Description string     `json:"description"`
	TargetDate  *string    `json:"target_date"` // YYYY-MM-DD format
	CompletedAt *time.Time `json:"completed_at"`
	CreatedAt   time.Time  `json:"created_at"`
}

type RiskControlMapping struct {
	ID        string    `json:"id"`
	RiskID    string    `json:"risk_id"`
	ControlID string    `json:"control_id"`
	CreatedAt time.Time `json:"created_at"`
}

type HeatmapCell struct {
	Likelihood int `json:"likelihood"`
	Impact     int `json:"impact"`
	Count      int `json:"count"`
}
