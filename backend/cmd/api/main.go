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

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"healthy"}`))
	})

	// Public routes
	r.Post("/auth/register", h.Register)
	r.Post("/auth/login", h.Login)
	r.Post("/auth/verify-mfa", h.VerifyMFA)
	r.Post("/auth/refresh", h.RefreshToken)

	// Authenticated routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.Auth(svc))
		r.Use(middleware.Tenant(repo)) // Tenancy validation runs if X-Workspace-ID is provided

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
		r.Get("/workspaces/{id}/integrations", h.GetWorkspaceIntegrations)
		r.Post("/workspaces/{id}/integrations/connect", h.ConnectIntegration)
		r.Post("/workspaces/{id}/integrations/{integration_id}/sync", h.SyncIntegration)
		r.Get("/workspaces/{id}/integrations/{integration_id}/sync-logs", h.GetSyncLogs)

		// Evidence & Continuous Monitoring
		r.Post("/workspaces/{id}/controls/{control_id}/evidence/upload", h.UploadEvidence)
		r.Get("/workspaces/{id}/controls/{control_id}/evidence", h.GetEvidenceLists)
		r.Get("/workspaces/{id}/controls/{control_id}/status-logs", h.GetControlStatusLogs)
		r.Post("/workspaces/{id}/controls/{control_id}/evaluate", h.EvaluateControl)
	})

	// Start server
	log.Printf("Starting TrustArmor GRC server on port %s...", cfg.Port)
	err = http.ListenAndServe(fmt.Sprintf(":%s", cfg.Port), r)
	if err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
