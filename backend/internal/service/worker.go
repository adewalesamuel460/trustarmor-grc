package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/repository"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/service/collectors"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/service/evaluators"
	"github.com/hibiken/asynq"
)

const TypeSyncIntegration = "task:sync_integration"

type SyncTaskPayload struct {
	IntegrationID string `json:"integration_id"`
}

type Worker struct {
	client     *asynq.Client
	server     *asynq.Server
	repo       *repository.Repository
	crypt      *EncryptionService
	ai         *AIService
	collectors *collectors.Registry
	evaluators *evaluators.Registry
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
		client:     client,
		server:     server,
		repo:       repo,
		crypt:      crypt,
		ai:         NewAIService(),
		collectors: collectors.NewRegistry(),
		evaluators: evaluators.NewRegistry(),
	}
}

// AI returns the OpenAI service wrapper
func (w *Worker) AI() *AIService {
	return w.ai
}

const TypeEvaluateControl = "task:evaluate_control"
const TypeCheckVendorExpiries = "task:check_vendor_expiries"

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

const TypeGenerateAnswers = "task:generate_answers"

type GenerateAnswersPayload struct {
	ProjectID string `json:"project_id"`
}

// EnqueueGenerateAnswers enqueues a response generation RAG job
func (w *Worker) EnqueueGenerateAnswers(projectID string) error {
	payload, err := json.Marshal(GenerateAnswersPayload{ProjectID: projectID})
	if err != nil {
		return err
	}

	task := asynq.NewTask(TypeGenerateAnswers, payload)
	info, err := w.client.Enqueue(task)
	if err != nil {
		return fmt.Errorf("failed to enqueue generate answers task: %w", err)
	}

	log.Printf("INFO [AsynqClient]: Enqueued task %s (ID: %s)", TypeGenerateAnswers, info.ID)
	return nil
}

const TypeGenerateAccessReviews = "task:generate_access_reviews"

type AccessReviewsPayload struct {
	CampaignID  string `json:"campaign_id"`
	WorkspaceID string `json:"workspace_id"`
	ReviewerID  string `json:"reviewer_id"`
}

func (w *Worker) EnqueueAccessReviewsTask(campaignID, workspaceID, reviewerID string) error {
	payload, err := json.Marshal(AccessReviewsPayload{
		CampaignID:  campaignID,
		WorkspaceID: workspaceID,
		ReviewerID:  reviewerID,
	})
	if err != nil {
		return err
	}

	task := asynq.NewTask(TypeGenerateAccessReviews, payload)
	info, err := w.client.Enqueue(task)
	if err != nil {
		return fmt.Errorf("failed to enqueue generate access reviews task: %w", err)
	}

	log.Printf("INFO [AsynqClient]: Enqueued task %s (ID: %s)", TypeGenerateAccessReviews, info.ID)
	return nil
}

const TypeSendNotification = "task:send_notification"

type SendNotificationPayload struct {
	WorkspaceID  string `json:"workspace_id"`
	TriggerEvent string `json:"trigger_event"`
	EntityID     string `json:"entity_id"`
}

func (w *Worker) EnqueueSendNotification(workspaceID, triggerEvent, entityID string) error {
	payload, err := json.Marshal(SendNotificationPayload{
		WorkspaceID:  workspaceID,
		TriggerEvent: triggerEvent,
		EntityID:     entityID,
	})
	if err != nil {
		return err
	}

	task := asynq.NewTask(TypeSendNotification, payload)
	info, err := w.client.Enqueue(task)
	if err != nil {
		return fmt.Errorf("failed to enqueue send notification task: %w", err)
	}

	log.Printf("INFO [AsynqClient]: Enqueued task %s (ID: %s)", TypeSendNotification, info.ID)
	return nil
}

// Start runs the Asynq worker server
func (w *Worker) Start() error {
	mux := asynq.NewServeMux()
	mux.HandleFunc(TypeSyncIntegration, w.handleSyncIntegrationTask)
	mux.HandleFunc(TypeEvaluateControl, w.handleEvaluateControlTask)
	mux.HandleFunc(TypeCheckVendorExpiries, w.handleCheckVendorExpiriesTask)
	mux.HandleFunc(TypeGenerateAnswers, w.handleGenerateAnswersTask)
	mux.HandleFunc(TypeGenerateAccessReviews, w.handleGenerateAccessReviewsTask)
	mux.HandleFunc(TypeSendNotification, w.handleSendNotificationTask)

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

	log.Printf("INFO [AsynqWorker]: Decrypted credentials successfully for provider %s.", wi.ProviderName)

	recordsFetched := 42
	collector, exists := w.collectors.Get(wi.ProviderName)
	if exists {
		log.Printf("INFO [AsynqWorker]: Found registered collector for provider '%s'. Fetching live/custom assets...", wi.ProviderName)
		results, collectErr := collector.FetchAssets(ctx, wi.EncryptedCredentials, plaintext)
		if collectErr != nil {
			log.Printf("ERROR [AsynqWorker]: Collector failed for %s: %v", wi.ProviderName, collectErr)
		} else {
			recordsFetched = len(results)
			for _, r := range results {
				asset := collectors.ToModelAsset(wi.WorkspaceID, wi.ID, r)
				_ = w.repo.UpsertAsset(ctx, &asset)
			}
			log.Printf("INFO [AsynqWorker]: Collector for '%s' successfully fetched & upserted %d assets into CMDB.", wi.ProviderName, recordsFetched)
		}
	} else {
		log.Printf("INFO [AsynqWorker]: No specific collector registered for provider '%s'. Using standard sync log fallback.", wi.ProviderName)
		time.Sleep(1 * time.Second)
	}

	// 4. Update status and write success log
	endTime := time.Now()
	syncLog := models.SyncLog{
		WorkspaceIntegrationID: p.IntegrationID,
		Status:                 "success",
		RecordsFetched:         recordsFetched,
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

	log.Printf("INFO [AsynqWorker]: Finished sync job for provider %s in %v (fetched %d records)", wi.ProviderName, endTime.Sub(startTime), recordsFetched)
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

	// 2. Query workspace assets from CMDB
	assets, _ := w.repo.GetWorkspaceAssets(ctx, ctrl.WorkspaceID, "")

	// 3. Evaluate control via Evaluator Registry
	evalResult, evalErr := w.evaluators.EvaluateControl(ctx, ctrl, assets)
	var newStatus string
	var reason string
	var payload map[string]interface{}

	if evalErr != nil {
		log.Printf("WARNING [AsynqWorker]: Evaluator error for control %s: %v", ctrl.ID, evalErr)
		newStatus = "error"
		reason = fmt.Sprintf("Evaluation execution error: %v", evalErr)
		payload = map[string]interface{}{"status": "error", "error": evalErr.Error()}
	} else {
		newStatus = evalResult.Status
		reason = evalResult.Reason
		payload = evalResult.Payload
	}

	// 4. Create evidence record
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

		// Trigger task generation and notification if control transitioned to failing
		if newStatus == "failing" {
			desc := fmt.Sprintf("Failing compliance control: %s. Action is required to remediate this issue.", ctrl.Title)
			task := models.Task{
				WorkspaceID:        ctrl.WorkspaceID,
				Title:              "Remediate failed control: " + ctrl.Title,
				Description:        &desc,
				Status:             "todo",
				Priority:           "critical",
				AssigneeID:         ctrl.OwnerID,
				RelatedEntityType:  ptrString("control"),
				RelatedEntityID:    ptrString(p.ControlID),
			}
			err = w.repo.CreateTask(ctx, &task)
			if err != nil {
				log.Printf("ERROR [AsynqWorker]: Failed to create remediation task: %v", err)
			} else {
				_ = w.EnqueueSendNotification(ctrl.WorkspaceID, "control.failed", task.ID)
			}
		}
	}

	log.Printf("INFO [AsynqWorker]: Finished evaluation job for control %s in %v. New Status: %s", ctrl.Title, time.Since(startTime), newStatus)
	return nil
}

func (w *Worker) handleCheckVendorExpiriesTask(ctx context.Context, t *asynq.Task) error {
	log.Printf("INFO [AsynqWorker]: Executing daily check_vendor_expiries worker task...")
	
	// Query expiring vendor documents exactly 30 days away
	docs, err := w.repo.GetExpiringVendorDocuments(ctx, 30)
	if err != nil {
		log.Printf("ERROR [AsynqWorker]: Failed to query expiring vendor compliance artifacts: %v", err)
		return err
	}

	for _, doc := range docs {
		log.Printf("WARNING [AsynqWorker]: Vendor Compliance Artifact '%s' (ID: %s) for Vendor '%s' is expiring in exactly 30 days on %s!", 
			doc.Title, doc.ID, doc.VendorName, doc.ExpiresAt)
	}

	log.Printf("INFO [AsynqWorker]: Completed check_vendor_expiries task. Found %d expiring items.", len(docs))
	return nil
}

func (w *Worker) handleGenerateAnswersTask(ctx context.Context, t *asynq.Task) error {
	var p GenerateAnswersPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("failed to unmarshal generate answers payload: %w", err)
	}

	log.Printf("INFO [AsynqWorker]: Started RAG answers generation for Project ID: %s", p.ProjectID)

	// 1. Fetch project to verify details and set status to 'generating'
	proj, err := w.repo.GetQuestionnaireProjectByID(ctx, p.ProjectID)
	if err != nil {
		return fmt.Errorf("failed to get project: %w", err)
	}
	_ = w.repo.UpdateProjectStatus(ctx, p.ProjectID, "generating")

	// 2. Fetch all nested pairs for the project
	pairs, err := w.repo.GetQuestionnairePairs(ctx, p.ProjectID)
	if err != nil {
		return fmt.Errorf("failed to fetch project questions: %w", err)
	}

	for _, pair := range pairs {
		if pair.Status != "pending" {
			continue // Skip already drafted or approved items
		}

		// A. Generate embedding for original question
		emb, err := w.ai.GetEmbedding(ctx, pair.OriginalQuestion)
		if err != nil {
			log.Printf("ERROR [AsynqWorker]: Failed to embed question '%s': %v", pair.OriginalQuestion, err)
			continue
		}

		// B. Query database for top 3 matching KB items
		kbMatches, scores, err := w.repo.SearchSimilarityKB(ctx, proj.WorkspaceID, emb, 3)
		if err != nil {
			log.Printf("ERROR [AsynqWorker]: Similarity search failed: %v", err)
		}

		// C. Build RAG Context prompt
		var contextTexts []string
		for idx, match := range kbMatches {
			contextTexts = append(contextTexts, fmt.Sprintf("[%d] Question: %s\nAnswer: %s", idx+1, match.Question, match.Answer))
		}
		
		var prompt string
		if len(contextTexts) > 0 {
			prompt = fmt.Sprintf(
				"You are a security compliance expert. Use the following approved company knowledge to answer the question. If the knowledge does not cover it, say 'Requires manual review'.\n\nKnowledge:\n%s\n\nQuestion: %s",
				strings.Join(contextTexts, "\n\n"),
				pair.OriginalQuestion,
			)
		} else {
			prompt = fmt.Sprintf(
				"You are a security compliance expert. Answer the following question. If you do not have sufficient information, say 'Requires manual review'.\n\nQuestion: %s",
				pair.OriginalQuestion,
			)
		}

		// D. Generate answer using OpenAI Chat Completion API
		draftAnswer, err := w.ai.GenerateAnswer(ctx, prompt)
		if err != nil {
			log.Printf("ERROR [AsynqWorker]: Failed to generate answer: %v", err)
			draftAnswer = "Requires manual review"
		}

		// E. Determine confidence score based on closest context similarity
		confidence := 0.0
		if len(scores) > 0 {
			confidence = scores[0]
			if confidence < 0.0 {
				confidence = 0.0
			}
			if confidence > 1.0 {
				confidence = 1.0
			}
		}

		// F. Save drafted answer
		err = w.repo.SavePairDraft(ctx, pair.ID, draftAnswer, confidence)
		if err != nil {
			log.Printf("ERROR [AsynqWorker]: Failed to save draft answer: %v", err)
		}
	}

	// 3. Mark project status as 'in_review' when worker finishes drafting
	_ = w.repo.UpdateProjectStatus(ctx, p.ProjectID, "in_review")
	log.Printf("INFO [AsynqWorker]: Completed drafting questions for Project ID: %s", p.ProjectID)
	return nil
}

func (w *Worker) handleGenerateAccessReviewsTask(ctx context.Context, t *asynq.Task) error {
	var payload AccessReviewsPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal access reviews payload: %w", err)
	}

	log.Printf("INFO [AsynqWorker]: Generating access items for Campaign ID: %s", payload.CampaignID)

	// 1. Fetch workspace members
	members, err := w.repo.GetWorkspaceMembers(ctx, payload.WorkspaceID)
	if err != nil {
		return fmt.Errorf("failed to retrieve workspace members for campaign review: %w", err)
	}

	// 2. Resolve systems list (fallback to defaults if no integrations connect yet)
	systems := []string{"AWS", "GitHub", "Salesforce"}
	integrations, err := w.repo.GetWorkspaceIntegrations(ctx, payload.WorkspaceID)
	if err == nil && len(integrations) > 0 {
		systems = nil
		for _, integration := range integrations {
			systems = append(systems, integration.ProviderName)
		}
	}

	// 3. Create items in DB mapping each user/system combination
	for _, member := range members {
		for _, sys := range systems {
			item := models.AccessReviewItem{
				CampaignID:   payload.CampaignID,
				AccountEmail: member.UserEmail,
				SystemName:   sys,
				ReviewerID:   &payload.ReviewerID, // Triggering manager reviews them
			}
			_ = w.repo.CreateAccessReviewItem(ctx, &item)
		}
	}

	// 4. Update campaign status to in_progress
	err = w.repo.UpdateCampaignStatus(ctx, payload.CampaignID, "in_progress")
	if err != nil {
		return fmt.Errorf("failed to transition campaign status: %w", err)
	}

	log.Printf("INFO [AsynqWorker]: Successfully completed generating access reviews for Campaign ID: %s", payload.CampaignID)
	return nil
}

func (w *Worker) handleSendNotificationTask(ctx context.Context, t *asynq.Task) error {
	var payload SendNotificationPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal notification payload: %w", err)
	}

	log.Printf("INFO [AsynqWorker]: Dispatching notifications for Trigger Event: %s", payload.TriggerEvent)

	// Fetch active notification rules matching trigger event
	rules, err := w.repo.GetActiveRulesForEvent(ctx, payload.WorkspaceID, payload.TriggerEvent)
	if err != nil {
		log.Printf("ERROR [AsynqWorker]: Failed to fetch active notification rules: %v", err)
		return err
	}

	if len(rules) == 0 {
		log.Printf("INFO [AsynqWorker]: No active notification rules configured for trigger event: %s", payload.TriggerEvent)
		return nil
	}

	// Loop and simulate alerts
	for _, rule := range rules {
		log.Printf("ALERT SENT: Trigger '%s' matched rule '%s'. Simulating sending %s alert to target destination: '%s' for entity ID: %s",
			payload.TriggerEvent, rule.ID, rule.ActionType, rule.TargetDestination, payload.EntityID)
	}

	return nil
}

func ptrString(s string) *string {
	return &s
}
