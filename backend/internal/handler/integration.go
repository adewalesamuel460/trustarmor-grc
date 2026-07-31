package handler

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/middleware"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
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
		ProviderID  string  `json:"provider_id"`
		ProductID   *string `json:"product_id"`
		Credentials string  `json:"credentials"` // API key / token
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.ProviderID == "" {
		h.respondError(w, http.StatusBadRequest, "Provider ID is required")
		return
	}

	// Handle internal_app API Key connection creation
	if req.ProviderID == "internal_app" || req.ProviderID == "c0000000-0000-0000-0000-000000000004" {
		rawAPIKey, apiKeyHash, err := generateAPIKey()

		if err != nil {
			h.respondError(w, http.StatusInternalServerError, "Failed to generate API Key: "+err.Error())
			return
		}

		var pidPtr *string
		if req.ProductID != nil && *req.ProductID != "" {
			pidPtr = req.ProductID
		}

		wi, err := h.repo.ConnectInternalAppIntegration(r.Context(), workspaceID, pidPtr, apiKeyHash)
		if err != nil {
			h.respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		// Audit log
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
			map[string]interface{}{"provider_id": "internal_app", "product_id": pidPtr, "status": "connected"},
			ipAddress,
		)

		h.respondJSON(w, http.StatusCreated, map[string]interface{}{
			"message":       "Internal App integration connected successfully. Store this API Key securely, it will not be shown again.",
			"connection_id": wi.ID,
			"product_id":    wi.ProductID,
			"api_key":       rawAPIKey,
		})
		return
	}

	if req.Credentials == "" {
		h.respondError(w, http.StatusBadRequest, "Credentials are required for standard integration providers")
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

	// 3. Audit log the integration connection creation
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

// CreateIntegrationProvider handles POST /integrations/providers to register a custom provider
func (h *Handler) CreateIntegrationProvider(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name     string  `json:"name"`
		Category string  `json:"category"`
		AuthType string  `json:"auth_type"`
		LogoURL  *string `json:"logo_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" || req.Category == "" || req.AuthType == "" {
		h.respondError(w, http.StatusBadRequest, "Name, Category, and AuthType are required fields")
		return
	}

	p := models.IntegrationProvider{
		Name:     req.Name,
		Category: req.Category,
		AuthType: req.AuthType,
		LogoURL:  req.LogoURL,
	}

	err := h.svc.CreateIntegrationProvider(r.Context(), &p)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusCreated, p)
}

// IngestInternalAppAssets handles POST /workspaces/{id}/integrations/{connectionId}/assets
func (h *Handler) IngestInternalAppAssets(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	connectionID := chi.URLParam(r, "connectionId")
	if connectionID == "" {
		connectionID = chi.URLParam(r, "connection_id")
	}

	if workspaceID == "" || connectionID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID and Connection ID are required")
		return
	}

	// 1. Authenticate via Bearer API Key token
	authHeader := r.Header.Get("Authorization")
	var rawToken string
	if strings.HasPrefix(authHeader, "Bearer ") {
		rawToken = strings.TrimPrefix(authHeader, "Bearer ")
	} else {
		rawToken = r.Header.Get("X-API-Key")
	}

	if rawToken == "" {
		h.respondError(w, http.StatusUnauthorized, "Missing API Key in Authorization header (Bearer <key>) or X-API-Key header")
		return
	}

	tokenHash := hashAPIKey(rawToken)
	wi, err := h.repo.GetIntegrationByAPIKeyHash(r.Context(), tokenHash)
	if err != nil || wi == nil {
		h.respondError(w, http.StatusUnauthorized, "Invalid or unrecognized API Key")
		return
	}

	if wi.WorkspaceID != workspaceID || wi.ID != connectionID {
		h.respondError(w, http.StatusForbidden, "API Key does not match the target workspace or connection")
		return
	}

	// 2. Decode payload
	var req struct {
		ProductID *string `json:"product_id"`
		Assets    []struct {
			AssetType      string                 `json:"asset_type"`
			ExternalID     string                 `json:"external_id"`
			Name           string                 `json:"name"`
			RawData        map[string]interface{} `json:"raw_data"`
			ComplianceRisk bool                   `json:"compliance_risk"`
		} `json:"assets"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	// Determine linked product_id (from request payload or connection setting)
	targetProductID := wi.ProductID
	if req.ProductID != nil && *req.ProductID != "" {
		targetProductID = req.ProductID
	}

	if targetProductID != nil && wi.ProductID != nil && *targetProductID != *wi.ProductID {
		h.respondError(w, http.StatusBadRequest, fmt.Sprintf("Payload product_id (%s) does not match connection product_id (%s)", *targetProductID, *wi.ProductID))
		return
	}

	startTime := time.Now()
	ingestedCount := 0

	for _, a := range req.Assets {
		if a.AssetType == "" || a.ExternalID == "" {
			continue
		}
		if a.RawData == nil {
			a.RawData = make(map[string]interface{})
		}

		if targetProductID != nil {
			a.RawData["product_id"] = *targetProductID
		}

		assetModel := models.Asset{
			WorkspaceID:    workspaceID,
			IntegrationID:  connectionID,
			AssetType:      a.AssetType,
			ExternalID:     a.ExternalID,
			Name:           a.Name,
			RawData:        a.RawData,
			ComplianceRisk: a.ComplianceRisk,
			LastDiscovered: time.Now(),
		}

		if err := h.repo.UpsertAsset(r.Context(), &assetModel); err == nil {
			ingestedCount++
		}
	}

	endTime := time.Now()

	// 3. Record SyncLog
	syncLog := models.SyncLog{
		WorkspaceIntegrationID: connectionID,
		Status:                 "success",
		RecordsFetched:         ingestedCount,
		StartedAt:              startTime,
		CompletedAt:            endTime,
		DurationMs:             endTime.Sub(startTime).Milliseconds(),
	}
	_ = h.repo.CreateSyncLog(r.Context(), &syncLog)
	_ = h.repo.UpdateIntegrationStatus(r.Context(), connectionID, "connected", endTime)

	// 4. Trigger continuous evaluation for linked controls via Asynq worker
	if targetProductID != nil {
		controls, err := h.repo.GetProductControls(r.Context(), workspaceID, *targetProductID)
		if err == nil {
			for _, ctrl := range controls {
				_ = h.worker.EnqueueEvaluateControl(ctrl.ControlID)
			}
		}
	} else {
		// Evaluate all workspace controls
		controls, err := h.repo.GetControls(r.Context(), workspaceID)
		if err == nil {
			for _, ctrl := range controls {
				_ = h.worker.EnqueueEvaluateControl(ctrl.ID)
			}
		}
	}

	h.respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":          "Assets ingested and compliance evaluation triggered successfully",
		"connection_id":    connectionID,
		"records_ingested": ingestedCount,
		"synced_at":        endTime,
	})
}

func generateAPIKey() (rawKey string, hashHex string, err error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", "", err
	}
	rawKey = "ta_live_app_" + hex.EncodeToString(bytes)
	hash := sha256.Sum256([]byte(rawKey))
	return rawKey, hex.EncodeToString(hash[:]), nil
}

func hashAPIKey(rawKey string) string {
	hash := sha256.Sum256([]byte(rawKey))
	return hex.EncodeToString(hash[:])
}

