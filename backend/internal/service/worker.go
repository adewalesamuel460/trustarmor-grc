package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/repository"
	"github.com/hibiken/asynq"
)

const TypeSyncIntegration = "task:sync_integration"

type SyncTaskPayload struct {
	IntegrationID string `json:"integration_id"`
}

type Worker struct {
	client *asynq.Client
	server *asynq.Server
	repo   *repository.Repository
	crypt  *EncryptionService
}

func NewWorker(redisAddr string, repo *repository.Repository, crypt *EncryptionService) *Worker {
	client := asynq.NewClient(asynq.RedisClientOpt{Addr: redisAddr})
	server := asynq.NewServer(
		asynq.RedisClientOpt{Addr: redisAddr},
		asynq.Config{
			Concurrency: 5,
			Queues: map[string]int{
				"default": 10,
			},
		},
	)

	return &Worker{
		client: client,
		server: server,
		repo:   repo,
		crypt:  crypt,
	}
}

const TypeEvaluateControl = "task:evaluate_control"

type EvaluateControlPayload struct {
	ControlID string `json:"control_id"`
}

// Close releases resources
func (w *Worker) Close() {
	_ = w.client.Close()
	w.server.Shutdown()
}

// EnqueueSyncTask pushes a sync job onto the task queue
func (w *Worker) EnqueueSyncTask(integrationID string) error {
	payload, err := json.Marshal(SyncTaskPayload{IntegrationID: integrationID})
	if err != nil {
		return err
	}

	task := asynq.NewTask(TypeSyncIntegration, payload)
	info, err := w.client.Enqueue(task)
	if err != nil {
		return fmt.Errorf("failed to enqueue sync task: %w", err)
	}

	log.Printf("INFO [AsynqClient]: Enqueued task %s (ID: %s)", TypeSyncIntegration, info.ID)
	return nil
}

// EnqueueEvaluateControl pushes a control evaluation job onto the task queue
func (w *Worker) EnqueueEvaluateControl(controlID string) error {
	payload, err := json.Marshal(EvaluateControlPayload{ControlID: controlID})
	if err != nil {
		return err
	}

	task := asynq.NewTask(TypeEvaluateControl, payload)
	info, err := w.client.Enqueue(task)
	if err != nil {
		return fmt.Errorf("failed to enqueue evaluate control task: %w", err)
	}

	log.Printf("INFO [AsynqClient]: Enqueued task %s (ID: %s)", TypeEvaluateControl, info.ID)
	return nil
}

// Start runs the Asynq worker server
func (w *Worker) Start() error {
	mux := asynq.NewServeMux()
	mux.HandleFunc(TypeSyncIntegration, w.handleSyncIntegrationTask)
	mux.HandleFunc(TypeEvaluateControl, w.handleEvaluateControlTask)

	log.Println("INFO [AsynqServer]: Starting Asynq background worker server...")
	if err := w.server.Run(mux); err != nil {
		return fmt.Errorf("failed to run Asynq server: %w", err)
	}
	return nil
}

func (w *Worker) handleSyncIntegrationTask(ctx context.Context, t *asynq.Task) error {
	var p SyncTaskPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("failed to unmarshal task payload: %w", err)
	}

	startTime := time.Now()
	log.Printf("INFO [AsynqWorker]: Started sync job for integration ID %s", p.IntegrationID)

	// 1. Fetch connection details
	wi, err := w.repo.GetWorkspaceIntegrationByID(ctx, p.IntegrationID)
	if err != nil {
		log.Printf("ERROR [AsynqWorker]: Failed to fetch integration connection %s: %v", p.IntegrationID, err)
		return err
	}

	// 2. Decrypt credentials to ensure validity
	plaintext, err := w.crypt.Decrypt(wi.EncryptedCredentials)
	if err != nil {
		errMsg := fmt.Sprintf("failed to decrypt integration credentials: %v", err)
		log.Printf("ERROR [AsynqWorker]: %s", errMsg)

		// Create failure sync log
		endTime := time.Now()
		syncLog := models.SyncLog{
			WorkspaceIntegrationID: p.IntegrationID,
			Status:                 "failed",
			RecordsFetched:         0,
			ErrorMessage:           &errMsg,
			StartedAt:              startTime,
			CompletedAt:            endTime,
		}
		_ = w.repo.CreateSyncLog(ctx, &syncLog)
		_ = w.repo.UpdateIntegrationStatus(ctx, p.IntegrationID, "error", endTime)
		return nil // Return nil so the task is not retried infinitely for credentials issues
	}

	if len(plaintext) == 0 {
		log.Println("WARNING [AsynqWorker]: Plaintext credentials are empty")
	}

	log.Printf("INFO [AsynqWorker]: Decrypted credentials successfully for provider %s. Running mock API calls...", wi.ProviderName)

	// 3. Simulate 2-second API delay
	time.Sleep(2 * time.Second)

	// 4. Update status and write success log
	endTime := time.Now()
	syncLog := models.SyncLog{
		WorkspaceIntegrationID: p.IntegrationID,
		Status:                 "success",
		RecordsFetched:         42, // Seed/Mock records count
		ErrorMessage:           nil,
		StartedAt:              startTime,
		CompletedAt:            endTime,
	}

	err = w.repo.CreateSyncLog(ctx, &syncLog)
	if err != nil {
		log.Printf("ERROR [AsynqWorker]: Failed to insert sync log: %v", err)
		return err
	}

	err = w.repo.UpdateIntegrationStatus(ctx, p.IntegrationID, "connected", endTime)
	if err != nil {
		log.Printf("ERROR [AsynqWorker]: Failed to update integration status: %v", err)
		return err
	}

	log.Printf("INFO [AsynqWorker]: Finished sync job for provider %s in %v (fetched 42 records)", wi.ProviderName, endTime.Sub(startTime))
	return nil
}

func (w *Worker) handleEvaluateControlTask(ctx context.Context, t *asynq.Task) error {
	var p EvaluateControlPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("failed to unmarshal evaluate payload: %w", err)
	}

	startTime := time.Now()
	log.Printf("INFO [AsynqWorker]: Started evaluation job for control ID %s", p.ControlID)

	// 1. Fetch control details
	ctrl, err := w.repo.GetControlByID(ctx, p.ControlID)
	if err != nil {
		log.Printf("ERROR [AsynqWorker]: Failed to fetch control %s: %v", p.ControlID, err)
		return err
	}

	// 2. Evaluate and determine status based on title check
	// "Require MFA" or similar fails, others pass.
	title := ctrl.Title
	var newStatus string
	var reason string
	var payload map[string]interface{}

	// Check specifically for MFA/2FA keywords
	isMFA := false
	// We'll perform a proper string check
	lowerTitle := ""
	for _, char := range title {
		if char >= 'A' && char <= 'Z' {
			lowerTitle += string(char + 32)
		} else {
			lowerTitle += string(char)
		}
	}

	for _, term := range []string{"mfa", "multi-factor", "2fa", "multifactor"} {
		// Simple substring check
		// Let's implement index-based check
		for i := 0; i <= len(lowerTitle)-len(term); i++ {
			if lowerTitle[i:i+len(term)] == term {
				isMFA = true
				break
			}
		}
	}

	if isMFA {
		newStatus = "failing"
		reason = "Mock integration failed: 2FA/MFA enforcement check failed on connected GitHub integration. User 'john.doe@company.com' has 2FA disabled."
		payload = map[string]interface{}{
			"status":      "failed",
			"checked_at":  time.Now().Format(time.RFC3339),
			"error_users": []string{"john.doe@company.com"},
			"rule_logic": map[string]interface{}{
				"resource":  "github_org",
				"condition": "members_2fa_enforced == true",
			},
		}
	} else {
		newStatus = "passing"
		reason = "Mock integration passed: Verified that public access block is enabled for all S3 buckets."
		payload = map[string]interface{}{
			"status":     "passed",
			"checked_at": time.Now().Format(time.RFC3339),
			"details": map[string]interface{}{
				"checked_buckets": 12,
				"public_buckets":  0,
			},
			"rule_logic": map[string]interface{}{
				"resource":  "aws_s3_buckets",
				"condition": "public_access_blocked == true",
			},
		}
	}

	// 3. Create evidence record
	evidence := models.Evidence{
		ControlID:   p.ControlID,
		WorkspaceID: ctrl.WorkspaceID,
		Type:        "automated",
		Payload:     payload,
	}
	err = w.repo.InsertEvidence(ctx, &evidence)
	if err != nil {
		log.Printf("ERROR [AsynqWorker]: Failed to insert evidence: %v", err)
		return err
	}

	// 4. Update control status if changed, and insert control status log
	previousStatus := ctrl.CurrentStatus
	if previousStatus != newStatus {
		err = w.repo.UpdateControlStatus(ctx, p.ControlID, newStatus, time.Now())
		if err != nil {
			log.Printf("ERROR [AsynqWorker]: Failed to update control status: %v", err)
			return err
		}

		statusLog := models.ControlStatusLog{
			ControlID:      p.ControlID,
			PreviousStatus: &previousStatus,
			NewStatus:      newStatus,
			Reason:         &reason,
		}
		err = w.repo.CreateControlStatusLog(ctx, &statusLog)
		if err != nil {
			log.Printf("ERROR [AsynqWorker]: Failed to write control status log: %v", err)
			return err
		}

		// 5. Create immutable audit log for control status change (Phase 2 integration)
		systemEmail := "System Worker"
		err = w.repo.CreateAuditLog(ctx, models.AuditLog{
			WorkspaceID:  ctrl.WorkspaceID,
			ActorID:      nil,
			ActorEmail:   &systemEmail,
			Action:       "control.status_changed",
			ResourceType: "control",
			ResourceID:   p.ControlID,
			OldValue:     &previousStatus,
			NewValue:     &newStatus,
			IPAddress:    "127.0.0.1",
		})
		if err != nil {
			log.Printf("ERROR [AsynqWorker]: Failed to create audit log: %v", err)
		}
	}

	log.Printf("INFO [AsynqWorker]: Finished evaluation job for control %s in %v. New Status: %s", ctrl.Title, time.Since(startTime), newStatus)
	return nil
}
