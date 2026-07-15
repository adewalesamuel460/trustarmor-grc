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

type Vendor struct {
	ID              string           `json:"id"`
	WorkspaceID     string           `json:"workspace_id"`
	Name            string           `json:"name"`
	Domain          string           `json:"domain"`
	Description     string           `json:"description"`
	RiskTier        string           `json:"risk_tier"`
	Status          string           `json:"status"`
	OwnerID         *string          `json:"owner_id"`
	OwnerEmail      *string          `json:"owner_email,omitempty"`
	HasExpiringDocs bool             `json:"has_expiring_docs"`
	CreatedAt       time.Time        `json:"created_at"`
	UpdatedAt       time.Time        `json:"updated_at"`
	Documents       []VendorDocument `json:"documents"`
}

type VendorDocument struct {
	ID           string     `json:"id"`
	VendorID     string     `json:"vendor_id"`
	DocumentType string     `json:"document_type"`
	Title        string     `json:"title"`
	FileURL      string     `json:"file_url"`
	ValidFrom    *time.Time `json:"valid_from"`
	ExpiresAt    *time.Time `json:"expires_at"`
	CreatedAt    time.Time  `json:"created_at"`
}

type KnowledgeBaseItem struct {
	ID          string    `json:"id"`
	WorkspaceID string    `json:"workspace_id"`
	Question    string    `json:"question"`
	Answer      string    `json:"answer"`
	SourceType  string    `json:"source_type"`
	Tags        []string  `json:"tags"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type QuestionnaireProject struct {
	ID                 string    `json:"id"`
	WorkspaceID        string    `json:"workspace_id"`
	Name               string    `json:"name"`
	Status             string    `json:"status"`
	TotalQuestions     int       `json:"total_questions"`
	CompletedQuestions int       `json:"completed_questions"`
	CreatedAt          time.Time `json:"created_at"`
}

type QuestionnairePair struct {
	ID               string    `json:"id"`
	ProjectID        string    `json:"project_id"`
	OriginalQuestion string    `json:"original_question"`
	AIDraftAnswer    *string   `json:"ai_draft_answer"`
	FinalAnswer      *string   `json:"final_answer"`
	ConfidenceScore  *float64  `json:"confidence_score"`
	Status           string    `json:"status"`
	ReviewerID       *string   `json:"reviewer_id"`
	ReviewerEmail    *string   `json:"reviewer_email,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
}

type TrustCenter struct {
	ID              string    `json:"id"`
	WorkspaceID     string    `json:"workspace_id"`
	URLSlug         string    `json:"url_slug"`
	HeroTitle       string    `json:"hero_title"`
	HeroDescription string    `json:"hero_description"`
	PrimaryColor    string    `json:"primary_color"`
	IsPublished     bool      `json:"is_published"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type TrustCenterResource struct {
	ID              string    `json:"id"`
	TrustCenterID   string    `json:"trust_center_id"`
	ResourceType    string    `json:"resource_type"`
	ResourceID      string    `json:"resource_id"`
	Visibility      string    `json:"visibility"`
	DisplayOrder    int       `json:"display_order"`
	CreatedAt       time.Time `json:"created_at"`
	ResourceName    string    `json:"resource_name,omitempty"`
	ResourceDetails string    `json:"resource_details,omitempty"`
}

type NDARequest struct {
	ID               string     `json:"id"`
	TrustCenterID    string     `json:"trust_center_id"`
	ResourceID       string     `json:"resource_id"`
	RequesterEmail   string     `json:"requester_email"`
	RequesterCompany string     `json:"requester_company"`
	Reason           string     `json:"reason"`
	Status           string     `json:"status"`
	ExpiresAt        *time.Time `json:"expires_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	DocumentTitle    string     `json:"document_title,omitempty"`
	SecureLink       *string    `json:"secure_link,omitempty"`
}

type AuditRun struct {
	ID                 string            `json:"id"`
	WorkspaceID        string            `json:"workspace_id"`
	Name               string            `json:"name"`
	FrameworkID        string            `json:"framework_id"`
	AuditorFirm        string            `json:"auditor_firm"`
	StartDate          string            `json:"start_date"`
	EndDate            string            `json:"end_date"`
	Status             string            `json:"status"`
	CreatedAt          time.Time         `json:"created_at"`
	UpdatedAt          time.Time         `json:"updated_at"`
	FrameworkName      string            `json:"framework_name,omitempty"`
	RequestsCount      int               `json:"requests_count,omitempty"`
	AcceptedPercentage float64           `json:"accepted_percentage,omitempty"`
	Auditors           []User            `json:"auditors,omitempty"`
	EvidenceRequests   []EvidenceRequest `json:"evidence_requests,omitempty"`
	FrameworkControls  []Control         `json:"framework_controls,omitempty"`
}

type AuditRunAuditor struct {
	ID         string    `json:"id"`
	AuditRunID string    `json:"audit_run_id"`
	UserID     string    `json:"user_id"`
	CreatedAt  time.Time `json:"created_at"`
}

type EvidenceRequest struct {
	ID               string         `json:"id"`
	AuditRunID       string         `json:"audit_run_id"`
	ControlID        string         `json:"control_id"`
	Title            string         `json:"title"`
	Description      string         `json:"description"`
	Status           string         `json:"status"`
	LinkedEvidenceID *string        `json:"linked_evidence_id"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	ControlName      string         `json:"control_name,omitempty"`
	ControlDesc      string         `json:"control_desc,omitempty"`
	LinkedFileUrl    *string        `json:"linked_file_url,omitempty"`
	Comments         []AuditComment `json:"comments,omitempty"`
}

type AuditComment struct {
	ID                string    `json:"id"`
	EvidenceRequestID string    `json:"evidence_request_id"`
	UserID            string    `json:"user_id"`
	UserEmail         string    `json:"user_email,omitempty"`
	UserRole          string    `json:"user_role,omitempty"`
	Comment           string    `json:"comment"`
	CreatedAt         time.Time `json:"created_at"`
}

type AccessReviewCampaign struct {
	ID                 string             `json:"id"`
	WorkspaceID        string             `json:"workspace_id"`
	Name               string             `json:"name"`
	Status             string             `json:"status"`
	Deadline           string             `json:"deadline"`
	CreatedAt          time.Time          `json:"created_at"`
	UpdatedAt          time.Time          `json:"updated_at"`
	CompletedItems     int                `json:"completed_items,omitempty"`
	TotalItems         int                `json:"total_items,omitempty"`
	ReviewItems        []AccessReviewItem `json:"review_items,omitempty"`
}

type AccessReviewItem struct {
	ID           string     `json:"id"`
	CampaignID   string     `json:"campaign_id"`
	AccountEmail string     `json:"account_email"`
	SystemName   string     `json:"system_name"`
	ReviewerID   *string    `json:"reviewer_id"`
	Decision     string     `json:"decision"`
	DecidedAt    *time.Time `json:"decided_at,omitempty"`
	Notes        *string    `json:"notes,omitempty"`
	CampaignName string     `json:"campaign_name,omitempty"`
}

type TrainingRecord struct {
	ID             string     `json:"id"`
	WorkspaceID    string     `json:"workspace_id"`
	UserID         string     `json:"user_id"`
	UserEmail      string     `json:"user_email,omitempty"`
	ModuleName     string     `json:"module_name"`
	Status         string     `json:"status"`
	CompletedAt    *time.Time `json:"completed_at,omitempty"`
	CertificateUrl *string    `json:"certificate_url,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

type AIAsset struct {
	ID                 string    `json:"id"`
	WorkspaceID        string    `json:"workspace_id"`
	ToolName           string    `json:"tool_name"`
	VendorID           *string   `json:"vendor_id"`
	VendorName         string    `json:"vendor_name,omitempty"`
	BusinessPurpose    *string   `json:"business_purpose"`
	DataClassification string    `json:"data_classification"`
	ApprovalStatus     string    `json:"approval_status"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type DataTransfer struct {
	ID                 string    `json:"id"`
	WorkspaceID        string    `json:"workspace_id"`
	VendorID           *string   `json:"vendor_id"`
	VendorName         string    `json:"vendor_name,omitempty"`
	OriginCountry      string    `json:"origin_country"`
	DestinationCountry string    `json:"destination_country"`
	DataCategories     []string  `json:"data_categories"`
	LegalBasis         *string   `json:"legal_basis"`
	Status             string    `json:"status"`
	CreatedAt          time.Time `json:"created_at"`
}

type RegulatoryFiling struct {
	ID          string     `json:"id"`
	WorkspaceID string     `json:"workspace_id"`
	Regulator   string     `json:"regulator"`
	FilingYear  int        `json:"filing_year"`
	DueDate     string     `json:"due_date"`
	Status      string     `json:"status"`
	SubmittedAt *time.Time `json:"submitted_at,omitempty"`
	DPOName     *string    `json:"dpo_name"`
	EvidenceID  *string    `json:"evidence_id"`
	CreatedAt   time.Time  `json:"created_at"`
}
