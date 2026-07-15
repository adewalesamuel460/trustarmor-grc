package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/middleware"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/go-chi/chi/v5"
)

// CreateAccessReviewCampaign handles POST /workspaces/:workspace_id/access-reviews
func (h *Handler) CreateAccessReviewCampaign(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r.Context())
	roleName := middleware.GetRoleName(r.Context())

	if roleName != "Admin" && roleName != "Compliance Manager" {
		h.respondError(w, http.StatusForbidden, "Only Admin or Compliance Manager can start access reviews")
		return
	}

	var req struct {
		Name     string `json:"name"`
		Deadline string `json:"deadline"` // e.g. "2026-09-30"
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" || req.Deadline == "" {
		h.respondError(w, http.StatusBadRequest, "Name and deadline are required")
		return
	}

	camp := models.AccessReviewCampaign{
		WorkspaceID: workspaceID,
		Name:        req.Name,
		Deadline:    req.Deadline,
	}

	err := h.repo.CreateAccessReviewCampaign(r.Context(), &camp)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Queue Asynq generation worker
	err = h.worker.EnqueueAccessReviewsTask(camp.ID, workspaceID, userID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to enqueue review generation task: "+err.Error())
		return
	}

	h.respondJSON(w, http.StatusCreated, camp)
}

// ListAccessReviewCampaigns handles GET /workspaces/:workspace_id/access-reviews
func (h *Handler) ListAccessReviewCampaigns(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	list, err := h.repo.ListAccessReviewCampaigns(r.Context(), workspaceID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, list)
}

// ListPendingAccessReviewItems handles GET /workspaces/:workspace_id/access-reviews/pending
func (h *Handler) ListPendingAccessReviewItems(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	list, err := h.repo.ListPendingAccessReviewItems(r.Context(), userID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, list)
}

// UpdateAccessReviewItemDecision handles POST /workspaces/:workspace_id/access-reviews/items/:item_id/decide
func (h *Handler) UpdateAccessReviewItemDecision(w http.ResponseWriter, r *http.Request) {
	itemID := chi.URLParam(r, "item_id")
	var req struct {
		Decision string `json:"decision"` // 'keep' | 'revoke'
		Notes    string `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Decision != "keep" && req.Decision != "revoke" {
		h.respondError(w, http.StatusBadRequest, "Decision must be either 'keep' or 'revoke'")
		return
	}

	err := h.repo.UpdateAccessReviewItemDecision(r.Context(), itemID, req.Decision, req.Notes)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "Access decision logged successfully"})
}

// FinalizeAccessReviewCampaign handles POST /workspaces/:workspace_id/access-reviews/:campaign_id/finalize
func (h *Handler) FinalizeAccessReviewCampaign(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	campaignID := chi.URLParam(r, "campaign_id")
	roleName := middleware.GetRoleName(r.Context())

	if roleName != "Admin" && roleName != "Compliance Manager" {
		h.respondError(w, http.StatusForbidden, "Only Admin or Compliance Manager can finalize campaigns")
		return
	}

	camp, err := h.repo.GetAccessReviewCampaign(r.Context(), campaignID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Campaign not found")
		return
	}

	if camp.Status == "completed" {
		h.respondError(w, http.StatusBadRequest, "Campaign is already finalized")
		return
	}

	// 1. Fetch control mapping (for evidence logs validation)
	controlID, err := h.repo.GetAccessReviewControl(r.Context(), workspaceID)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "No compliance framework control found to link UAR evidence. Please activate a Framework first.")
		return
	}

	// 2. Fetch all review decisions
	items, err := h.repo.GetAccessReviewCampaignItems(r.Context(), campaignID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to retrieve campaign decisions: "+err.Error())
		return
	}

	// 3. Format JSON evidence dump map
	payloadMap := map[string]interface{}{
		"items":         items,
		"campaign_name": camp.Name,
		"deadline":      camp.Deadline,
		"finalized_at":  time.Now().Format(time.RFC3339),
	}

	// 4. Record evidence
	ev := models.Evidence{
		ControlID:   controlID,
		WorkspaceID: workspaceID,
		Type:        "automated",
		Payload:     payloadMap,
	}
	err = h.repo.InsertEvidence(r.Context(), &ev)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to register automated review evidence: "+err.Error())
		return
	}

	// 5. Update campaign status to completed
	err = h.repo.UpdateCampaignStatus(r.Context(), campaignID, "completed")
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to complete campaign: "+err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":     "Campaign finalized successfully",
		"evidence_id": ev.ID,
		"control_id":  controlID,
	})
}

// ListTrainingRecords handles GET /workspaces/:workspace_id/training
func (h *Handler) ListTrainingRecords(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r.Context())

	// If the user is just an employee, auto-generate Phishing module for them if none exists
	roleName := middleware.GetRoleName(r.Context())
	if roleName == "Employee" || roleName == "" {
		mockModules := []string{"Phishing Awareness 101", "Secure Coding Standards", "GDPR & HIPAA Compliance"}
		for _, mod := range mockModules {
			tr := models.TrainingRecord{
				WorkspaceID: workspaceID,
				UserID:      userID,
				ModuleName:  mod,
			}
			_ = h.repo.CreateTrainingRecord(r.Context(), &tr)
		}
	} else {
		// If Admin/Manager, also auto-generate for workspace users if database is empty so there is mock data to test
		records, err := h.repo.ListTrainingRecords(r.Context(), workspaceID)
		if err == nil && len(records) == 0 {
			members, err := h.repo.GetWorkspaceMembers(r.Context(), workspaceID)
			if err == nil {
				for _, member := range members {
					tr := models.TrainingRecord{
						WorkspaceID: workspaceID,
						UserID:      member.UserID,
						ModuleName:  "Phishing Awareness 101",
					}
					_ = h.repo.CreateTrainingRecord(r.Context(), &tr)
				}
			}
		}
	}

	list, err := h.repo.ListTrainingRecords(r.Context(), workspaceID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, list)
}

// CompleteTrainingRecord handles POST /workspaces/:workspace_id/training/:record_id/complete
func (h *Handler) CompleteTrainingRecord(w http.ResponseWriter, r *http.Request) {
	recordID := chi.URLParam(r, "record_id")
	
	// Create mock certificate PDF URL
	certURL := "https://trustarmor-proofs.s3.amazonaws.com/certificates/cert_" + recordID + ".pdf"

	err := h.repo.CompleteTrainingRecord(r.Context(), recordID, certURL)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{
		"message":         "Training completed successfully",
		"certificate_url": certURL,
	})
}
