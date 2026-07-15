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

// Start runs the Asynq worker server
func (w *Worker) Start() error {
	mux := asynq.NewServeMux()
	mux.HandleFunc(TypeSyncIntegration, w.handleSyncIntegrationTask)

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
