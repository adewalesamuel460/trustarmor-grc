package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/config"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/db"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/handler"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/middleware"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/repository"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/service"
	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
)

func main() {
	ctx := context.Background()

	// Load configuration
	cfg := config.Load()

	// Connect to database
	database, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Database connection failure: %v", err)
	}
	defer database.Close()

	// Run migrations
	err = database.RunMigrations(ctx)
	if err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Initialize layers
	repo := repository.New(database)
	auditSvc := service.NewAuditService(repo)

	// Encryption settings
	encryptSecret := os.Getenv("ENCRYPTION_KEY")
	if encryptSecret == "" {
		encryptSecret = "trustarmor_development_secret_encryption_key_2026"
	}
	encryptSvc := service.NewEncryptionService(encryptSecret)

	// Asynq Background worker
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}
	worker := service.NewWorker(redisAddr, repo, encryptSvc)
	defer worker.Close()

	// Launch background worker server
	go func() {
		if err := worker.Start(); err != nil {
			log.Printf("ERROR [AsynqWorkerServer]: server stopped: %v", err)
		}
	}()

	// Storage Service configuration (S3 with local fallback)
	var storageSvc service.StorageService
	s3Bucket := os.Getenv("AWS_S3_BUCKET")
	s3Region := os.Getenv("AWS_REGION")
	s3AccessKey := os.Getenv("AWS_ACCESS_KEY_ID")
	s3SecretKey := os.Getenv("AWS_SECRET_ACCESS_KEY")

	if s3Bucket != "" && s3Region != "" && s3AccessKey != "" && s3SecretKey != "" {
		var err error
		storageSvc, err = service.NewS3Storage(ctx, s3Bucket, s3Region, s3AccessKey, s3SecretKey)
		if err != nil {
			log.Printf("WARNING [Storage]: Failed to configure S3 storage: %v. Falling back to local storage.", err)
			storageSvc = nil
		} else {
			log.Println("INFO [Storage]: Configured AWS S3 Storage Service successfully.")
		}
	}

	if storageSvc == nil {
		apiURL := os.Getenv("API_URL")
		if apiURL == "" {
			apiURL = "http://localhost:" + cfg.Port
		}
		var err error
		storageSvc, err = service.NewLocalStorage("./uploads", apiURL)
		if err != nil {
			log.Fatalf("Fatal [Storage]: Failed to initialize local storage fallback: %v", err)
		}
		log.Println("INFO [Storage]: Configured Local Storage Service (fallback) under './uploads'.")
	}

	svc := service.New(repo, auditSvc, cfg.JWTSecret)
	h := handler.New(svc, auditSvc, encryptSvc, worker, storageSvc, repo)

	// Set up router
	r := chi.NewRouter()

	// Global Middlewares
	r.Use(middleware.CORS)
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)

	// Serve local uploaded files statically
	r.Handle("/uploads/*", http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads"))))

	// Root route - friendly message instead of 404 when backend URL is opened directly
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"service":"TrustArmor GRC API","status":"running","version":"1.0.0","note":"This is the backend API server. Access the application via the frontend on port 3000."}`))
	})

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"healthy","service":"trustarmor-grc-api"}`))
	})

	// Public routes
	r.Post("/auth/register", h.Register)
	r.Post("/auth/login", h.Login)
	r.Post("/auth/verify-mfa", h.VerifyMFA)
	r.Post("/auth/refresh", h.RefreshToken)

	// Public Trust Center routes (unauthenticated)
	r.Get("/public/trust-center/{slug}", h.PublicGetTrustCenter)
	r.Post("/public/trust-center/{slug}/nda-requests", h.PublicCreateNDARequest)

	// Authenticated Admin routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.Auth(svc))
		r.Route("/admin", func(r chi.Router) {
			r.Use(middleware.RequireGlobalAdmin(repo))
			r.Get("/tenants", h.AdminListTenants)
			r.Patch("/tenants/{id}/status", h.AdminUpdateTenantStatus)
			r.Get("/tenants/{id}/users", h.AdminGetTenantUsers)
			r.Get("/tenants/{id}/frameworks", h.AdminGetTenantFrameworks)
			r.Post("/impersonate", h.AdminImpersonateUser)
			r.Post("/frameworks/push", h.AdminPushGlobalFramework)
			r.Get("/audit-logs", h.AdminGetAuditLogs)
			// Admin management
			r.Get("/admins", h.AdminListGlobalAdmins)
			r.Post("/admins/promote", h.AdminPromoteUser)
			r.Post("/admins/demote", h.AdminDemoteUser)
		})
	})

	// Authenticated routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.Auth(svc))
		r.Use(middleware.Tenant(repo)) // Tenancy validation runs if X-Workspace-ID is provided
		r.Use(middleware.RequireAuditorScoping(repo))

		// User profile
		r.Get("/users/me", h.GetProfile)
		r.Put("/users/me/password", h.ChangePassword)

		// MFA management
		r.Post("/auth/mfa/setup", h.SetupMFA)
		r.Post("/auth/mfa/confirm", h.ConfirmMFA)

		// Workspaces list and create
		r.Get("/workspaces", h.GetWorkspaces)
		r.Post("/workspaces", h.CreateWorkspace)

		// Workspace member list
		r.Get("/workspaces/{id}/members", h.GetWorkspaceMembers)

		// Invitations (Requires Admin or Compliance Manager role via RBAC permission 'workspace:invite')
		r.With(middleware.RequirePermission("workspace:invite")).Post("/workspaces/{id}/invites", h.InviteMember)

		// Audit Logs (Requires Tenancy check)
		r.Get("/workspaces/{id}/audit-logs", h.GetAuditLogs)
		r.Get("/workspaces/{id}/audit-logs/export", h.ExportAuditLogs)

		// Frameworks & Requirements
		r.Get("/frameworks", h.GetFrameworks)
		r.Post("/frameworks", h.CreateFramework)
		r.Get("/workspaces/{id}/frameworks", h.GetActivatedFrameworks)
		r.Post("/workspaces/{id}/frameworks", h.ActivateFramework)
		r.Get("/workspaces/{id}/requirements", h.GetRequirements)

		// Controls & Mappings
		r.Post("/workspaces/{id}/controls", h.CreateControl)
		r.Get("/workspaces/{id}/controls", h.GetControls)
		r.Post("/workspaces/{id}/controls/{control_id}/map", h.MapControl)
		r.Get("/workspaces/{id}/frameworks/{framework_id}/posture", h.GetCompliancePosture)

		// Integrations & Background Workers
		r.Get("/integrations/providers", h.GetIntegrationProviders)
		r.Post("/integrations/providers", h.CreateIntegrationProvider)
		r.Get("/workspaces/{id}/integrations", h.GetWorkspaceIntegrations)
		r.Post("/workspaces/{id}/integrations/connect", h.ConnectIntegration)
		r.Post("/workspaces/{id}/integrations/{integration_id}/sync", h.SyncIntegration)
		r.Get("/workspaces/{id}/integrations/{integration_id}/sync-logs", h.GetSyncLogs)

		// Evidence & Continuous Monitoring
		r.Post("/workspaces/{id}/controls/{control_id}/evidence/upload", h.UploadEvidence)
		r.Get("/workspaces/{id}/controls/{control_id}/evidence", h.GetEvidenceLists)
		r.Get("/workspaces/{id}/controls/{control_id}/status-logs", h.GetControlStatusLogs)
		r.Post("/workspaces/{id}/controls/{control_id}/evaluate", h.EvaluateControl)

		// Policies & E-Signatures
		r.Get("/workspaces/{id}/policies", h.GetPolicies)
		r.Post("/workspaces/{id}/policies", h.CreatePolicy)
		r.Put("/workspaces/{id}/policies/{policy_id}", h.UpdatePolicy)
		r.Post("/workspaces/{id}/policies/{policy_id}/publish", h.PublishPolicy)
		r.Get("/workspaces/{id}/policies/pending-signatures", h.GetPendingSignatures)
		r.Post("/workspaces/{id}/policies/versions/{version_id}/acknowledge", h.AcknowledgePolicy)
		r.Get("/workspaces/{id}/policies/{policy_id}/tracking", h.GetPolicyTracking)

		// Risk Register & Enterprise GRC
		r.Get("/workspaces/{id}/risks", h.GetRisks)
		r.Post("/workspaces/{id}/risks", h.CreateRisk)
		r.Patch("/workspaces/{id}/risks/{risk_id}", h.UpdateRisk)
		r.Post("/workspaces/{id}/risks/{risk_id}/treatments", h.AddTreatment)
		r.Post("/workspaces/{id}/risks/{risk_id}/map-controls", h.MapRiskControls)
		r.Get("/workspaces/{id}/risks/heatmap", h.GetRiskHeatmap)

		// Vendor Risk Management & TPRM
		r.Get("/workspaces/{id}/vendors", h.GetVendors)
		r.Post("/workspaces/{id}/vendors", h.CreateVendor)
		r.Get("/workspaces/{id}/vendors/{vendor_id}", h.GetVendorByID)
		r.Patch("/workspaces/{id}/vendors/{vendor_id}", h.UpdateVendor)
		r.Post("/workspaces/{id}/vendors/{vendor_id}/documents", h.AddVendorDocument)
		r.Delete("/workspaces/{id}/vendors/{vendor_id}/documents/{doc_id}", h.DeleteVendorDocument)

		// AI-Powered Security Questionnaires & RAG
		r.Get("/workspaces/{id}/knowledge-base", h.GetKnowledgeBase)
		r.Post("/workspaces/{id}/knowledge-base", h.CreateKnowledgeBaseItem)
		r.Get("/workspaces/{id}/questionnaires", h.GetQuestionnaireProjects)
		r.Post("/workspaces/{id}/questionnaires/upload", h.UploadQuestionnaire)
		r.Get("/workspaces/{id}/questionnaires/{project_id}/pairs", h.GetQuestionnairePairs)
		r.Post("/workspaces/{id}/questionnaires/pairs/{pair_id}/approve", h.ApproveQuestionnairePair)

		// Trust Center Configuration & NDA requests (RBACTenancy)
		r.Get("/workspaces/{id}/trust-center", h.GetTrustCenter)
		r.Put("/workspaces/{id}/trust-center", h.UpdateTrustCenter)
		r.Post("/workspaces/{id}/trust-center/resources", h.AddTrustCenterResource)
		r.Delete("/workspaces/{id}/trust-center/resources/{resource_id}", h.RemoveTrustCenterResource)
		r.Get("/workspaces/{id}/trust-center/nda-requests", h.GetNDARequests)
		r.Post("/workspaces/{id}/trust-center/nda-requests/{req_id}/approve", h.ApproveNDARequest)

		// GRC Audit Hub & Evidence Ticketing
		r.Post("/workspaces/{id}/audits", h.CreateAuditRun)
		r.Get("/workspaces/{id}/audits", h.ListAuditRuns)
		r.Post("/workspaces/{id}/audits/{audit_id}/auditors", h.AddAuditor)
		r.Get("/workspaces/{id}/audits/{audit_id}", h.GetAuditRunDetails)
		r.Post("/workspaces/{id}/audits/{audit_id}/requests", h.CreateEvidenceRequest)
		r.Post("/workspaces/{id}/audits/requests/{req_id}/submit", h.SubmitEvidence)
		r.Post("/workspaces/{id}/audits/requests/{req_id}/review", h.ReviewEvidenceRequest)
		r.Post("/workspaces/{id}/audits/requests/{req_id}/comments", h.AddAuditComment)
		r.Get("/workspaces/{id}/audits/requests/{req_id}/comments", h.GetAuditComments)

		// User Access Reviews (UAR) Campaigns & Manager decisions
		r.Post("/workspaces/{id}/access-reviews", h.CreateAccessReviewCampaign)
		r.Get("/workspaces/{id}/access-reviews", h.ListAccessReviewCampaigns)
		r.Get("/workspaces/{id}/access-reviews/pending", h.ListPendingAccessReviewItems)
		r.Post("/workspaces/{id}/access-reviews/items/{item_id}/decide", h.UpdateAccessReviewItemDecision)
		r.Post("/workspaces/{id}/access-reviews/{campaign_id}/finalize", h.FinalizeAccessReviewCampaign)

		// Security Training Records
		r.Get("/workspaces/{id}/training", h.ListTrainingRecords)
		r.Post("/workspaces/{id}/training/{record_id}/complete", h.CompleteTrainingRecord)

		// AI Governance (ISO 42001)
		r.Get("/workspaces/{id}/ai-assets", h.GetAIAssets)
		r.Post("/workspaces/{id}/ai-assets", h.CreateAIAsset)
		r.Patch("/workspaces/{id}/ai-assets/{asset_id}", h.UpdateAIAssetApproval)

		// NDPR & Privacy Center
		r.Get("/workspaces/{id}/data-transfers", h.GetDataTransfers)
		r.Post("/workspaces/{id}/data-transfers", h.CreateDataTransfer)
		r.Get("/workspaces/{id}/regulatory-filings", h.GetRegulatoryFilings)
		r.Post("/workspaces/{id}/regulatory-filings/{filing_id}/submit", h.SubmitRegulatoryFiling)

		// Tasks & Remediation Queue (Phase 14)
		r.Get("/workspaces/{id}/tasks", h.ListTasks)
		r.Patch("/workspaces/{id}/tasks/{task_id}", h.UpdateTaskStatus)

		// Notification Alerts Setup
		r.Get("/workspaces/{id}/notification-rules", h.ListNotificationRules)
		r.Post("/workspaces/{id}/notification-rules", h.CreateNotificationRule)
		r.Delete("/workspaces/{id}/notification-rules/{rule_id}", h.DeleteNotificationRule)

		// Executive Reporting Metrics
		r.Get("/workspaces/{id}/reports/posture", h.GetReportsPosture)
		r.Get("/workspaces/{id}/reports/mttr", h.GetReportsMTTR)
		r.Get("/workspaces/{id}/reports/summary-widgets", h.GetReportsSummaryWidgets)

		// Incident Response & Vulnerability Management
		r.Get("/workspaces/{id}/incidents", h.GetIncidents)
		r.Post("/workspaces/{id}/incidents", h.CreateIncident)
		r.Get("/workspaces/{id}/incidents/{incident_id}/updates", h.GetIncidentUpdates)
		r.Post("/workspaces/{id}/incidents/{incident_id}/updates", h.AddIncidentUpdate)
		r.Patch("/workspaces/{id}/incidents/{incident_id}/resolve", h.ResolveIncident)
		r.Get("/workspaces/{id}/vulnerabilities", h.GetVulnerabilities)
		r.Post("/workspaces/{id}/vulnerabilities", h.IngestVulnerability)
	})

	// Start server
	log.Printf("Starting TrustArmor GRC server on port %s...", cfg.Port)
	err = http.ListenAndServe(fmt.Sprintf(":%s", cfg.Port), r)
	if err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
