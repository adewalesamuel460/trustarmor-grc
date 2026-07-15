package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/middleware"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/go-chi/chi/v5"
)

// GetTrustCenter handles GET /workspaces/:workspace_id/trust-center
func (h *Handler) GetTrustCenter(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	tc, err := h.repo.GetTrustCenterByWorkspace(r.Context(), workspaceID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	resources, err := h.repo.GetTrustCenterResources(r.Context(), tc.ID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]interface{}{
		"profile":   tc,
		"resources": resources,
	})
}

// UpdateTrustCenter handles PUT /workspaces/:workspace_id/trust-center
func (h *Handler) UpdateTrustCenter(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	var req struct {
		URLSlug         string `json:"url_slug"`
		HeroTitle       string `json:"hero_title"`
		HeroDescription string `json:"hero_description"`
		PrimaryColor    string `json:"primary_color"`
		IsPublished     bool   `json:"is_published"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.URLSlug == "" {
		h.respondError(w, http.StatusBadRequest, "URL Slug is required")
		return
	}

	tc, err := h.repo.GetTrustCenterByWorkspace(r.Context(), workspaceID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	tc.URLSlug = req.URLSlug
	tc.HeroTitle = req.HeroTitle
	tc.HeroDescription = req.HeroDescription
	tc.PrimaryColor = req.PrimaryColor
	tc.IsPublished = req.IsPublished

	err = h.repo.UpdateTrustCenter(r.Context(), tc)
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
		"trust_center.updated",
		"trust_center",
		tc.ID,
		nil,
		map[string]interface{}{"slug": tc.URLSlug, "is_published": tc.IsPublished},
		ipAddress,
	)

	h.respondJSON(w, http.StatusOK, tc)
}

// AddTrustCenterResource handles POST /workspaces/:workspace_id/trust-center/resources
func (h *Handler) AddTrustCenterResource(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	var req struct {
		ResourceType string `json:"resource_type"`
		ResourceID   string `json:"resource_id"`
		Visibility   string `json:"visibility"`
		DisplayOrder int    `json:"display_order"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.ResourceType == "" || req.ResourceID == "" {
		h.respondError(w, http.StatusBadRequest, "resource_type and resource_id fields are required")
		return
	}

	tc, err := h.repo.GetTrustCenterByWorkspace(r.Context(), workspaceID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	res := models.TrustCenterResource{
		TrustCenterID: tc.ID,
		ResourceType:  req.ResourceType,
		ResourceID:    req.ResourceID,
		Visibility:    req.Visibility,
		DisplayOrder:  req.DisplayOrder,
	}
	if res.Visibility == "" {
		res.Visibility = "public"
	}

	err = h.repo.AddTrustCenterResource(r.Context(), &res)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusCreated, res)
}

// RemoveTrustCenterResource handles DELETE /workspaces/:workspace_id/trust-center/resources/:resource_id
func (h *Handler) RemoveTrustCenterResource(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	resourceID := chi.URLParam(r, "resource_id")
	if resourceID == "" {
		h.respondError(w, http.StatusBadRequest, "Resource ID is required")
		return
	}

	tc, err := h.repo.GetTrustCenterByWorkspace(r.Context(), workspaceID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	err = h.repo.RemoveTrustCenterResource(r.Context(), tc.ID, resourceID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "Resource removed from Trust Center"})
}

// GetNDARequests handles GET /workspaces/:workspace_id/trust-center/nda-requests
func (h *Handler) GetNDARequests(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	tc, err := h.repo.GetTrustCenterByWorkspace(r.Context(), workspaceID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	requests, err := h.repo.GetNDARequests(r.Context(), tc.ID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Generate presigned secure download URL for approved requests
	for idx, req := range requests {
		if req.Status == "approved" {
			_, fileURL, err := h.repo.GetNDARequestByID(r.Context(), req.ID)
			if err == nil {
				link, err := h.storageSvc.Presign(r.Context(), fileURL, 7*24*time.Hour)
				if err == nil {
					requests[idx].SecureLink = &link
				}
			}
		}
	}

	h.respondJSON(w, http.StatusOK, requests)
}

// ApproveNDARequest handles POST /workspaces/:workspace_id/trust-center/nda-requests/:id/approve
func (h *Handler) ApproveNDARequest(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	requestID := chi.URLParam(r, "req_id")
	if requestID == "" {
		h.respondError(w, http.StatusBadRequest, "NDA Request ID is required")
		return
	}

	// Fetch request details
	req, fileURL, err := h.repo.GetNDARequestByID(r.Context(), requestID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "NDA request not found")
		return
	}

	// Calculate expiration date (7 days away)
	expiresAt := time.Now().Add(7 * 24 * time.Hour)

	// Update status
	err = h.repo.ApproveNDARequest(r.Context(), requestID, expiresAt)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Generate pre-signed URL using StorageService
	link, err := h.storageSvc.Presign(r.Context(), fileURL, 7*24*time.Hour)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to generate presigned document link: "+err.Error())
		return
	}

	req.Status = "approved"
	req.ExpiresAt = &expiresAt
	req.SecureLink = &link

	// Audit approval
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
		"trust_center.nda_approved",
		"nda_request",
		req.ID,
		nil,
		map[string]interface{}{"requester_email": req.RequesterEmail, "document_title": req.DocumentTitle},
		ipAddress,
	)

	h.respondJSON(w, http.StatusOK, req)
}

// PublicGetTrustCenter handles GET /public/trust-center/:slug
func (h *Handler) PublicGetTrustCenter(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	if slug == "" {
		h.respondError(w, http.StatusBadRequest, "URL Slug is required")
		return
	}

	tc, err := h.repo.GetTrustCenterBySlug(r.Context(), slug)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Trust Center not found or not published")
		return
	}

	resources, err := h.repo.GetTrustCenterResources(r.Context(), tc.ID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Masking payload: never return direct download links, evidence logs, control tests, or raw secrets.
	// Only return names, types, details, and visibility settings.
	var publicRes []interface{}
	for _, res := range resources {
		publicRes = append(publicRes, map[string]interface{}{
			"id":            res.ResourceID,
			"resource_type": res.ResourceType,
			"name":          res.ResourceName,
			"details":       res.ResourceDetails,
			"visibility":    res.Visibility,
		})
	}

	h.respondJSON(w, http.StatusOK, map[string]interface{}{
		"profile":   tc,
		"resources": publicRes,
	})
}

// PublicCreateNDARequest handles POST /public/trust-center/:slug/nda-requests
func (h *Handler) PublicCreateNDARequest(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	if slug == "" {
		h.respondError(w, http.StatusBadRequest, "URL Slug is required")
		return
	}

	tc, err := h.repo.GetTrustCenterBySlug(r.Context(), slug)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Trust Center not found")
		return
	}

	var req struct {
		ResourceID       string `json:"resource_id"`
		RequesterEmail   string `json:"requester_email"`
		RequesterCompany string `json:"requester_company"`
		Reason           string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.ResourceID == "" || req.RequesterEmail == "" || req.RequesterCompany == "" {
		h.respondError(w, http.StatusBadRequest, "resource_id, requester_email, and requester_company fields are required")
		return
	}

	ndaReq := models.NDARequest{
		TrustCenterID:    tc.ID,
		ResourceID:       req.ResourceID,
		RequesterEmail:   req.RequesterEmail,
		RequesterCompany: req.RequesterCompany,
		Reason:           req.Reason,
	}

	err = h.repo.CreateNDARequest(r.Context(), &ndaReq)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusCreated, ndaReq)
}
