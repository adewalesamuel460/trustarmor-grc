package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/middleware"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/go-chi/chi/v5"
)

// GetVendors handles GET /workspaces/:workspace_id/vendors
func (h *Handler) GetVendors(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	vendors, err := h.repo.GetVendors(r.Context(), workspaceID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, vendors)
}

// CreateVendor handles POST /workspaces/:workspace_id/vendors
func (h *Handler) CreateVendor(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	var req struct {
		Name        string  `json:"name"`
		Domain      string  `json:"domain"`
		Description string  `json:"description"`
		RiskTier    string  `json:"risk_tier"`
		OwnerID     *string `json:"owner_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" {
		h.respondError(w, http.StatusBadRequest, "Vendor name is required")
		return
	}

	v := models.Vendor{
		WorkspaceID: workspaceID,
		Name:        req.Name,
		Domain:      req.Domain,
		Description: req.Description,
		RiskTier:    req.RiskTier,
		OwnerID:     req.OwnerID,
	}
	if v.RiskTier == "" {
		v.RiskTier = "medium"
	}

	err := h.repo.CreateVendor(r.Context(), &v)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit creation
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
		"vendor.created",
		"vendor",
		v.ID,
		nil,
		map[string]interface{}{"name": v.Name, "risk_tier": v.RiskTier},
		ipAddress,
	)

	h.respondJSON(w, http.StatusCreated, v)
}

// GetVendorByID handles GET /workspaces/:workspace_id/vendors/:vendor_id
func (h *Handler) GetVendorByID(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	vendorID := chi.URLParam(r, "vendor_id")
	if vendorID == "" {
		h.respondError(w, http.StatusBadRequest, "Vendor ID is required")
		return
	}

	vendor, err := h.repo.GetVendorByID(r.Context(), vendorID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Vendor not found")
		return
	}

	if vendor.WorkspaceID != workspaceID {
		h.respondError(w, http.StatusForbidden, "Access denied")
		return
	}

	h.respondJSON(w, http.StatusOK, vendor)
}

// UpdateVendor handles PATCH /workspaces/:workspace_id/vendors/:vendor_id
func (h *Handler) UpdateVendor(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	vendorID := chi.URLParam(r, "vendor_id")
	if vendorID == "" {
		h.respondError(w, http.StatusBadRequest, "Vendor ID is required")
		return
	}

	v, err := h.repo.GetVendorByID(r.Context(), vendorID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Vendor not found")
		return
	}

	if v.WorkspaceID != workspaceID {
		h.respondError(w, http.StatusForbidden, "Access denied")
		return
	}

	var req struct {
		Name        string  `json:"name"`
		Domain      string  `json:"domain"`
		Description string  `json:"description"`
		RiskTier    string  `json:"risk_tier"`
		Status      string  `json:"status"`
		OwnerID     *string `json:"owner_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	oldTier := v.RiskTier
	if req.Name != "" {
		v.Name = req.Name
	}
	if req.Domain != "" {
		v.Domain = req.Domain
	}
	v.Description = req.Description
	if req.RiskTier != "" {
		v.RiskTier = req.RiskTier
	}
	if req.Status != "" {
		v.Status = req.Status
	}
	v.OwnerID = req.OwnerID

	err = h.repo.UpdateVendor(r.Context(), v)
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
		"vendor.updated",
		"vendor",
		v.ID,
		&oldTier,
		map[string]interface{}{"name": v.Name, "risk_tier": v.RiskTier, "status": v.Status},
		ipAddress,
	)

	h.respondJSON(w, http.StatusOK, v)
}

// AddVendorDocument handles POST /workspaces/:workspace_id/vendors/:vendor_id/documents
func (h *Handler) AddVendorDocument(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	vendorID := chi.URLParam(r, "vendor_id")
	if vendorID == "" {
		h.respondError(w, http.StatusBadRequest, "Vendor ID is required")
		return
	}

	// Verify vendor
	v, err := h.repo.GetVendorByID(r.Context(), vendorID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Vendor not found")
		return
	}

	if v.WorkspaceID != workspaceID {
		h.respondError(w, http.StatusForbidden, "Access denied")
		return
	}

	// Parse multipart form
	err = r.ParseMultipartForm(10 << 20) // 10MB
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Failed to parse form: "+err.Error())
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "File field 'file' is required")
		return
	}
	defer file.Close()

	docType := r.FormValue("document_type")
	title := r.FormValue("title")
	if docType == "" || title == "" {
		h.respondError(w, http.StatusBadRequest, "document_type and title fields are required")
		return
	}

	// Parse optional dates
	var expiresAt *time.Time
	if val := r.FormValue("expires_at"); val != "" {
		t, err := time.Parse(time.RFC3339, val)
		if err == nil {
			expiresAt = &t
		} else {
			t, err = time.Parse("2006-01-02", val)
			if err == nil {
				expiresAt = &t
			}
		}
	}

	var validFrom *time.Time
	if val := r.FormValue("valid_from"); val != "" {
		t, err := time.Parse(time.RFC3339, val)
		if err == nil {
			validFrom = &t
		} else {
			t, err = time.Parse("2006-01-02", val)
			if err == nil {
				validFrom = &t
			}
		}
	}

	// Upload document
	fileURL, err := h.storageSvc.Upload(r.Context(), header.Filename, file)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to upload document file: "+err.Error())
		return
	}

	doc := models.VendorDocument{
		VendorID:     vendorID,
		DocumentType: docType,
		Title:        title,
		FileURL:      fileURL,
		ValidFrom:    validFrom,
		ExpiresAt:    expiresAt,
	}

	err = h.repo.AddVendorDocument(r.Context(), &doc)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit document uploaded
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
		"vendor_document.uploaded",
		"vendor_document",
		doc.ID,
		nil,
		map[string]interface{}{"title": doc.Title, "type": doc.DocumentType},
		ipAddress,
	)

	h.respondJSON(w, http.StatusCreated, doc)
}

// DeleteVendorDocument handles DELETE /workspaces/:workspace_id/vendors/:vendor_id/documents/:doc_id
func (h *Handler) DeleteVendorDocument(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	vendorID := chi.URLParam(r, "vendor_id")
	if vendorID == "" {
		h.respondError(w, http.StatusBadRequest, "Vendor ID is required")
		return
	}

	docID := chi.URLParam(r, "doc_id")
	if docID == "" {
		h.respondError(w, http.StatusBadRequest, "Document ID is required")
		return
	}

	// Verify vendor
	v, err := h.repo.GetVendorByID(r.Context(), vendorID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Vendor not found")
		return
	}

	if v.WorkspaceID != workspaceID {
		h.respondError(w, http.StatusForbidden, "Access denied")
		return
	}

	err = h.repo.DeleteVendorDocument(r.Context(), docID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit document deletion
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
		"vendor_document.deleted",
		"vendor_document",
		docID,
		nil,
		nil,
		ipAddress,
	)

	h.respondJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Vendor document removed successfully",
	})
}
