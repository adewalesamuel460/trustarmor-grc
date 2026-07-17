package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/middleware"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/go-chi/chi/v5"
)

// GetIncidents handles GET /workspaces/{id}/incidents
func (h *Handler) GetIncidents(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	incidents, err := h.svc.GetIncidents(r.Context(), workspaceID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, incidents)
}

// CreateIncident handles POST /workspaces/{id}/incidents
func (h *Handler) CreateIncident(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	var req struct {
		Title        string    `json:"title"`
		Description  string    `json:"description"`
		Severity     string    `json:"severity"`
		IsBreach     bool      `json:"is_breach"`
		DiscoveredAt time.Time `json:"discovered_at"`
		OwnerID      *string   `json:"owner_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Title == "" {
		h.respondError(w, http.StatusBadRequest, "Title is a required field")
		return
	}

	if req.Severity == "" {
		req.Severity = "medium"
	}

	if req.DiscoveredAt.IsZero() {
		req.DiscoveredAt = time.Now()
	}

	inc := models.Incident{
		WorkspaceID:  workspaceID,
		Title:        req.Title,
		Description:  req.Description,
		Severity:     req.Severity,
		Status:       "investigating",
		IsBreach:     req.IsBreach,
		DiscoveredAt: req.DiscoveredAt,
		OwnerID:      req.OwnerID,
	}

	err := h.svc.CreateIncident(r.Context(), &inc)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// 1. Audit log incident creation (Phase 2 integration)
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
		"incident.created",
		"incident",
		inc.ID,
		nil,
		inc,
		ipAddress,
	)

	h.respondJSON(w, http.StatusCreated, inc)
}

// AddIncidentUpdate handles POST /workspaces/{id}/incidents/{incident_id}/updates
func (h *Handler) AddIncidentUpdate(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	incidentID := chi.URLParam(r, "incident_id")
	if incidentID == "" {
		h.respondError(w, http.StatusBadRequest, "Incident ID is required")
		return
	}

	// Verify incident belongs to workspace
	inc, err := h.repo.GetIncidentByID(r.Context(), incidentID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Incident not found")
		return
	}
	if inc.WorkspaceID != workspaceID {
		h.respondError(w, http.StatusForbidden, "Access denied")
		return
	}

	var req struct {
		UpdateText string `json:"update_text"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.UpdateText == "" {
		h.respondError(w, http.StatusBadRequest, "Update text cannot be empty")
		return
	}

	userID := middleware.GetUserID(r.Context())
	var userIDPtr *string
	if userID != "" {
		userIDPtr = &userID
	}

	update := models.IncidentUpdate{
		IncidentID: incidentID,
		UserID:     userIDPtr,
		UpdateText: req.UpdateText,
	}

	err = h.svc.CreateIncidentUpdate(r.Context(), &update)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusCreated, update)
}

// ResolveIncident handles PATCH /workspaces/{id}/incidents/{incident_id}/resolve
func (h *Handler) ResolveIncident(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	incidentID := chi.URLParam(r, "incident_id")
	if incidentID == "" {
		h.respondError(w, http.StatusBadRequest, "Incident ID is required")
		return
	}

	// Verify incident belongs to workspace
	inc, err := h.repo.GetIncidentByID(r.Context(), incidentID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Incident not found")
		return
	}
	if inc.WorkspaceID != workspaceID {
		h.respondError(w, http.StatusForbidden, "Access denied")
		return
	}

	var req struct {
		RootCauseAnalysis string `json:"root_cause_analysis"`
		Status            string `json:"status"` // 'contained', 'resolved', 'closed'
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Status == "" {
		req.Status = "resolved"
	}

	err = h.svc.ResolveIncident(r.Context(), incidentID, req.RootCauseAnalysis, req.Status)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit log incident resolution (Phase 2 integration)
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
		"incident.resolved",
		"incident",
		incidentID,
		&inc.Status,
		&req.Status,
		ipAddress,
	)

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "Incident marked as contained/resolved successfully"})
}

// GetVulnerabilities handles GET /workspaces/{id}/vulnerabilities
func (h *Handler) GetVulnerabilities(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	vulnerabilities, err := h.svc.GetVulnerabilities(r.Context(), workspaceID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, vulnerabilities)
}

// IngestVulnerability handles POST /workspaces/{id}/vulnerabilities
func (h *Handler) IngestVulnerability(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	var req struct {
		IntegrationID *string   `json:"integration_id"`
		CVEID         string    `json:"cve_id"`
		Title         string    `json:"title"`
		Severity      string    `json:"severity"`
		AssetAffected string    `json:"asset_affected"`
		DiscoveredAt  time.Time `json:"discovered_at"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Title == "" || req.Severity == "" || req.AssetAffected == "" {
		h.respondError(w, http.StatusBadRequest, "Title, Severity, and AssetAffected are required fields")
		return
	}

	if req.DiscoveredAt.IsZero() {
		req.DiscoveredAt = time.Now()
	}

	vuln := models.Vulnerability{
		WorkspaceID:   workspaceID,
		IntegrationID: req.IntegrationID,
		CVEID:         req.CVEID,
		Title:         req.Title,
		Severity:      req.Severity,
		AssetAffected: req.AssetAffected,
		Status:        "open",
		DiscoveredAt:  req.DiscoveredAt,
	}

	err := h.svc.CreateVulnerability(r.Context(), &vuln)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusCreated, vuln)
}

// GetIncidentUpdates handles GET /workspaces/{id}/incidents/{incident_id}/updates
func (h *Handler) GetIncidentUpdates(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	incidentID := chi.URLParam(r, "incident_id")
	if incidentID == "" {
		h.respondError(w, http.StatusBadRequest, "Incident ID is required")
		return
	}

	// Verify incident belongs to workspace
	inc, err := h.repo.GetIncidentByID(r.Context(), incidentID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Incident not found")
		return
	}
	if inc.WorkspaceID != workspaceID {
		h.respondError(w, http.StatusForbidden, "Access denied")
		return
	}

	updates, err := h.svc.GetIncidentUpdates(r.Context(), incidentID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, updates)
}
