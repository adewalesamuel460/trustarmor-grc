package handler

import (
	"encoding/json"
	"net/http"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/middleware"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/go-chi/chi/v5"
)

// GetFrameworks lists all globally available frameworks
func (h *Handler) GetFrameworks(w http.ResponseWriter, r *http.Request) {
	frameworks, err := h.svc.GetFrameworks(r.Context())
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, frameworks)
}

// GetActivatedFrameworks lists activated frameworks for the workspace
func (h *Handler) GetActivatedFrameworks(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	frameworks, err := h.svc.GetActivatedFrameworks(r.Context(), workspaceID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, frameworks)
}

// ActivateFramework handles POST /workspaces/{id}/frameworks
func (h *Handler) ActivateFramework(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	var req struct {
		FrameworkID string `json:"framework_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.FrameworkID == "" {
		h.respondError(w, http.StatusBadRequest, "Framework ID is required")
		return
	}

	actorID := middleware.GetUserID(r.Context())
	ipAddress := r.RemoteAddr

	err := h.svc.ActivateFramework(r.Context(), workspaceID, req.FrameworkID, actorID, ipAddress)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "Framework activated successfully"})
}

// CreateControl handles POST /workspaces/{id}/controls
func (h *Handler) CreateControl(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	var c models.Control
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if c.Title == "" || c.Type == "" || c.Frequency == "" {
		h.respondError(w, http.StatusBadRequest, "Title, Type, and Frequency are required fields")
		return
	}

	c.WorkspaceID = workspaceID
	actorID := middleware.GetUserID(r.Context())
	ipAddress := r.RemoteAddr

	err := h.svc.CreateControl(r.Context(), &c, actorID, ipAddress)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusCreated, c)
}

// GetControls handles GET /workspaces/{id}/controls
func (h *Handler) GetControls(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	controls, err := h.svc.GetControls(r.Context(), workspaceID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, controls)
}

// MapControl handles POST /workspaces/{id}/controls/{control_id}/map
func (h *Handler) MapControl(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	controlID := chi.URLParam(r, "control_id")
	if controlID == "" {
		h.respondError(w, http.StatusBadRequest, "Control ID is required")
		return
	}

	var req struct {
		RequirementIDs []string `json:"requirement_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	actorID := middleware.GetUserID(r.Context())
	ipAddress := r.RemoteAddr

	err := h.svc.MapControl(r.Context(), workspaceID, controlID, req.RequirementIDs, actorID, ipAddress)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "Control mappings updated successfully"})
}

// GetCompliancePosture handles GET /workspaces/{id}/frameworks/{framework_id}/posture
func (h *Handler) GetCompliancePosture(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	frameworkID := chi.URLParam(r, "framework_id")
	if frameworkID == "" {
		h.respondError(w, http.StatusBadRequest, "Framework ID is required")
		return
	}

	percentage, err := h.svc.GetCompliancePosture(r.Context(), workspaceID, frameworkID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]interface{}{
		"framework_id":          frameworkID,
		"compliance_percentage": percentage,
	})
}

// GetRequirements handles GET /workspaces/{id}/requirements
func (h *Handler) GetRequirements(w http.ResponseWriter, r *http.Request) {
	requirements, err := h.svc.GetRequirements(r.Context())
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, requirements)
}
