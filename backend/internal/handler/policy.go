package handler

import (
	"encoding/json"
	"net/http"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/middleware"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/go-chi/chi/v5"
)

// GetPolicies handles GET /workspaces/:workspace_id/policies
func (h *Handler) GetPolicies(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	policies, err := h.repo.GetPolicies(r.Context(), workspaceID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, policies)
}

// CreatePolicy handles POST /workspaces/:workspace_id/policies
func (h *Handler) CreatePolicy(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	var req struct {
		Title       string  `json:"title"`
		Description string  `json:"description"`
		Content     *string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Title == "" {
		h.respondError(w, http.StatusBadRequest, "Policy title is required")
		return
	}

	p := models.Policy{
		WorkspaceID: workspaceID,
		Title:       req.Title,
		Description: req.Description,
		Content:     req.Content,
	}

	err := h.repo.CreatePolicy(r.Context(), &p)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit draft creation
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
		"policy.created",
		"policy",
		p.ID,
		nil,
		map[string]interface{}{"title": p.Title},
		ipAddress,
	)

	h.respondJSON(w, http.StatusCreated, p)
}

// UpdatePolicy handles PUT /workspaces/:workspace_id/policies/:policy_id
func (h *Handler) UpdatePolicy(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	policyID := chi.URLParam(r, "policy_id")
	if policyID == "" {
		h.respondError(w, http.StatusBadRequest, "Policy ID is required")
		return
	}

	// Verify policy access and draft status
	p, err := h.repo.GetPolicyByID(r.Context(), policyID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Policy not found")
		return
	}
	if p.WorkspaceID != workspaceID {
		h.respondError(w, http.StatusForbidden, "Access denied")
		return
	}
	if p.Status != "draft" {
		h.respondError(w, http.StatusBadRequest, "Cannot edit a published policy version")
		return
	}

	var req struct {
		Title       string  `json:"title"`
		Description string  `json:"description"`
		Content     *string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Title != "" {
		p.Title = req.Title
	}
	p.Description = req.Description
	p.Content = req.Content

	err = h.repo.UpdatePolicy(r.Context(), p)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit update
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
		"policy.updated",
		"policy",
		p.ID,
		nil,
		map[string]interface{}{"title": p.Title},
		ipAddress,
	)

	h.respondJSON(w, http.StatusOK, p)
}

// PublishPolicy handles POST /workspaces/:workspace_id/policies/:policy_id/publish
func (h *Handler) PublishPolicy(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	policyID := chi.URLParam(r, "policy_id")
	if policyID == "" {
		h.respondError(w, http.StatusBadRequest, "Policy ID is required")
		return
	}

	// Verify policy details
	p, err := h.repo.GetPolicyByID(r.Context(), policyID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Policy not found")
		return
	}
	if p.WorkspaceID != workspaceID {
		h.respondError(w, http.StatusForbidden, "Access denied")
		return
	}

	// Execute transactional publish
	pv, err := h.repo.PublishPolicy(r.Context(), policyID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit log publication
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
		"policy.published",
		"policy",
		policyID,
		&p.CurrentVersion,
		&pv.VersionNumber,
		ipAddress,
	)

	h.respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":        "Policy published successfully",
		"version_number": pv.VersionNumber,
		"version_id":     pv.ID,
	})
}

// GetPendingSignatures handles GET /workspaces/:workspace_id/policies/pending-signatures
func (h *Handler) GetPendingSignatures(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		h.respondError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	acks, err := h.repo.GetPendingSignatures(r.Context(), workspaceID, userID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, acks)
}

// AcknowledgePolicy handles POST /workspaces/:workspace_id/policies/versions/:version_id/acknowledge
func (h *Handler) AcknowledgePolicy(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	versionID := chi.URLParam(r, "version_id")
	if versionID == "" {
		h.respondError(w, http.StatusBadRequest, "Version ID is required")
		return
	}

	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		h.respondError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	ipAddress := r.RemoteAddr

	pa, err := h.repo.AcknowledgePolicy(r.Context(), versionID, userID, ipAddress)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to sign policy: "+err.Error())
		return
	}

	// Audit signature
	var actorEmail *string
	actorIDPtr := &userID
	user, err := h.repo.GetUserByID(r.Context(), userID)
	if err == nil {
		actorEmail = &user.Email
	}

	h.auditSvc.LogEvent(
		workspaceID,
		actorIDPtr,
		actorEmail,
		"policy.acknowledged",
		"policy_acknowledgment",
		pa.ID,
		nil,
		map[string]interface{}{"policy_version_id": versionID, "ip_address": ipAddress},
		ipAddress,
	)

	h.respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":   "Policy signed and acknowledged successfully",
		"signed_at": pa.SignedAt,
	})
}

// GetPolicyTracking handles GET /workspaces/:workspace_id/policies/:policy_id/tracking
func (h *Handler) GetPolicyTracking(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	policyID := chi.URLParam(r, "policy_id")
	if policyID == "" {
		h.respondError(w, http.StatusBadRequest, "Policy ID is required")
		return
	}

	// Verify Admin/Compliance Manager Access
	userID := middleware.GetUserID(r.Context())
	member, err := h.repo.GetWorkspaceMember(r.Context(), workspaceID, userID)
	if err != nil || (member.RoleName != "Admin" && member.RoleName != "Compliance Manager") {
		h.respondError(w, http.StatusForbidden, "Admin access required")
		return
	}

	tracking, err := h.repo.GetPolicyTracking(r.Context(), workspaceID, policyID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, tracking)
}
