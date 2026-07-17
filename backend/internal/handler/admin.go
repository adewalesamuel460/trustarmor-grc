package handler

import (
	"encoding/json"
	"net/http"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/middleware"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/go-chi/chi/v5"
)

// AdminListTenants handles GET /admin/tenants
func (h *Handler) AdminListTenants(w http.ResponseWriter, r *http.Request) {
	adminUserID := middleware.GetUserID(r.Context())
	tenants, err := h.svc.AdminListTenants(r.Context(), adminUserID)
	if err != nil {
		h.respondError(w, http.StatusForbidden, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, tenants)
}

// AdminUpdateTenantStatus handles PATCH /admin/tenants/{id}/status
func (h *Handler) AdminUpdateTenantStatus(w http.ResponseWriter, r *http.Request) {
	adminUserID := middleware.GetUserID(r.Context())
	orgID := chi.URLParam(r, "id")
	if orgID == "" {
		h.respondError(w, http.StatusBadRequest, "Organization ID is required")
		return
	}

	var req struct {
		Status string `json:"status"` // 'active', 'suspended'
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Status != "active" && req.Status != "suspended" {
		h.respondError(w, http.StatusBadRequest, "Status must be 'active' or 'suspended'")
		return
	}

	ipAddress := r.RemoteAddr
	err := h.svc.AdminUpdateTenantStatus(r.Context(), adminUserID, orgID, req.Status, ipAddress)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "Tenant status updated successfully"})
}

// AdminImpersonateUser handles POST /admin/impersonate
func (h *Handler) AdminImpersonateUser(w http.ResponseWriter, r *http.Request) {
	adminUserID := middleware.GetUserID(r.Context())
	var req struct {
		UserID string `json:"user_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.UserID == "" {
		h.respondError(w, http.StatusBadRequest, "User ID is required")
		return
	}

	ipAddress := r.RemoteAddr
	access, refresh, err := h.svc.AdminImpersonateUser(r.Context(), adminUserID, req.UserID, ipAddress)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{
		"access_token":  access,
		"refresh_token": refresh,
	})
}

// AdminPushGlobalFramework handles POST /admin/frameworks/push
func (h *Handler) AdminPushGlobalFramework(w http.ResponseWriter, r *http.Request) {
	adminUserID := middleware.GetUserID(r.Context())
	var req struct {
		Name         string               `json:"name"`
		Version      string               `json:"version"`
		Description  string               `json:"description"`
		Requirements []models.Requirement `json:"requirements"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" || req.Version == "" {
		h.respondError(w, http.StatusBadRequest, "Name and Version are required fields")
		return
	}

	f := models.Framework{
		Name:        req.Name,
		Version:     req.Version,
		Description: req.Description,
	}

	ipAddress := r.RemoteAddr
	err := h.svc.AdminPushGlobalFramework(r.Context(), adminUserID, &f, req.Requirements, ipAddress)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusCreated, f)
}

// AdminGetAuditLogs handles GET /admin/audit-logs
func (h *Handler) AdminGetAuditLogs(w http.ResponseWriter, r *http.Request) {
	adminUserID := middleware.GetUserID(r.Context())
	logs, err := h.svc.AdminGetAuditLogs(r.Context(), adminUserID)
	if err != nil {
		h.respondError(w, http.StatusForbidden, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, logs)
}

// AdminGetTenantUsers handles GET /admin/tenants/{id}/users
func (h *Handler) AdminGetTenantUsers(w http.ResponseWriter, r *http.Request) {
	adminUserID := middleware.GetUserID(r.Context())
	orgID := chi.URLParam(r, "id")
	if orgID == "" {
		h.respondError(w, http.StatusBadRequest, "Organization ID is required")
		return
	}

	users, err := h.svc.AdminGetTenantUsers(r.Context(), adminUserID, orgID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, users)
}

// AdminGetTenantFrameworks handles GET /admin/tenants/{id}/frameworks
func (h *Handler) AdminGetTenantFrameworks(w http.ResponseWriter, r *http.Request) {
	adminUserID := middleware.GetUserID(r.Context())
	orgID := chi.URLParam(r, "id")
	if orgID == "" {
		h.respondError(w, http.StatusBadRequest, "Organization ID is required")
		return
	}

	frameworks, err := h.svc.AdminGetTenantFrameworks(r.Context(), adminUserID, orgID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, frameworks)
}
