package handler

import (
	"encoding/json"
	"net/http"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/middleware"
	"github.com/go-chi/chi/v5"
)

// GetIntegrationProviders handles GET /integrations/providers
func (h *Handler) GetIntegrationProviders(w http.ResponseWriter, r *http.Request) {
	providers, err := h.repo.GetIntegrationProviders(r.Context())
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, providers)
}

// GetWorkspaceIntegrations handles GET /workspaces/{id}/integrations
func (h *Handler) GetWorkspaceIntegrations(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	integrations, err := h.repo.GetWorkspaceIntegrations(r.Context(), workspaceID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, integrations)
}

// ConnectIntegration handles POST /workspaces/{id}/integrations/connect
func (h *Handler) ConnectIntegration(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	var req struct {
		ProviderID  string `json:"provider_id"`
		Credentials string `json:"credentials"` // API key / token
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.ProviderID == "" || req.Credentials == "" {
		h.respondError(w, http.StatusBadRequest, "Provider ID and Credentials are required")
		return
	}

	// 1. Encrypt credentials using AES-256-GCM
	encryptedCreds, err := h.encryptSvc.Encrypt([]byte(req.Credentials))
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to encrypt credentials: "+err.Error())
		return
	}

	// 2. Save connection to DB
	wi, err := h.repo.ConnectIntegration(r.Context(), workspaceID, req.ProviderID, encryptedCreds)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// 3. Audit log the integration connection creation (Phase 2 integration)
	actorID := middleware.GetUserID(r.Context())
	ipAddress := r.RemoteAddr
	var actorEmail *string
	var actorIDPtr *string
	if actorID != "" {
		actorIDPtr = &actorID
		user, err := h.repo.GetUserByID(r.Context(), actorID)
		if err == nil {
			actorEmail = &user.Email
		}
	}

	h.auditSvc.LogEvent(
		workspaceID,
		actorIDPtr,
		actorEmail,
		"integration.connected",
		"workspace_integration",
		wi.ID,
		nil,
		map[string]interface{}{"provider_id": req.ProviderID, "status": "connected"},
		ipAddress,
	)

	// 4. Enqueue initial background sync job via Asynq
	err = h.worker.EnqueueSyncTask(wi.ID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to enqueue initial background sync task: "+err.Error())
		return
	}

	// 5. Return 202 Accepted immediately
	h.respondJSON(w, http.StatusAccepted, map[string]interface{}{
		"message":        "Integration connection initiated and background sync enqueued",
		"connection_id":  wi.ID,
		"sync_status":    "pending",
	})
}

// SyncIntegration handles POST /workspaces/{id}/integrations/{integration_id}/sync
func (h *Handler) SyncIntegration(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	integrationID := chi.URLParam(r, "integration_id")
	if integrationID == "" {
		h.respondError(w, http.StatusBadRequest, "Integration connection ID is required")
		return
	}

	// Verify integration connection exists and belongs to the active workspace
	wi, err := h.repo.GetWorkspaceIntegrationByID(r.Context(), integrationID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Integration connection not found")
		return
	}
	if wi.WorkspaceID != workspaceID {
		h.respondError(w, http.StatusForbidden, "Access to connection denied")
		return
	}

	// 1. Audit log the manual sync trigger
	actorID := middleware.GetUserID(r.Context())
	ipAddress := r.RemoteAddr
	var actorEmail *string
	var actorIDPtr *string
	if actorID != "" {
		actorIDPtr = &actorID
		user, err := h.repo.GetUserByID(r.Context(), actorID)
		if err == nil {
			actorEmail = &user.Email
		}
	}

	h.auditSvc.LogEvent(
		workspaceID,
		actorIDPtr,
		actorEmail,
		"integration.sync_triggered",
		"workspace_integration",
		integrationID,
		nil,
		map[string]interface{}{"sync_trigger": "manual"},
		ipAddress,
	)

	// 2. Enqueue background sync job via Asynq
	err = h.worker.EnqueueSyncTask(integrationID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to enqueue background sync task: "+err.Error())
		return
	}

	// 3. Return 202 Accepted immediately
	h.respondJSON(w, http.StatusAccepted, map[string]interface{}{
		"message":     "Manual sync triggered successfully and enqueued to queue",
		"sync_status": "pending",
	})
}

// GetSyncLogs handles GET /workspaces/{id}/integrations/{integration_id}/sync-logs
func (h *Handler) GetSyncLogs(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	integrationID := chi.URLParam(r, "integration_id")
	if integrationID == "" {
		h.respondError(w, http.StatusBadRequest, "Integration connection ID is required")
		return
	}

	// Verify integration connection belongs to active workspace
	wi, err := h.repo.GetWorkspaceIntegrationByID(r.Context(), integrationID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Integration connection not found")
		return
	}
	if wi.WorkspaceID != workspaceID {
		h.respondError(w, http.StatusForbidden, "Access denied")
		return
	}

	logs, err := h.repo.GetSyncLogs(r.Context(), integrationID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, logs)
}
