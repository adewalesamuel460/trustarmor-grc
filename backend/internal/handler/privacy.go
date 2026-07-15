package handler

import (
	"encoding/json"
	"net/http"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/go-chi/chi/v5"
)

// GetAIAssets handles GET /workspaces/:id/ai-assets
func (h *Handler) GetAIAssets(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	list, err := h.repo.ListAIAssets(r.Context(), workspaceID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, list)
}

// CreateAIAsset handles POST /workspaces/:id/ai-assets
func (h *Handler) CreateAIAsset(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	var req struct {
		ToolName           string  `json:"tool_name"`
		VendorID           *string `json:"vendor_id"`
		BusinessPurpose    *string `json:"business_purpose"`
		DataClassification string  `json:"data_classification"` // 'Public', 'Internal', 'Confidential', 'Restricted/PII'
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.ToolName == "" || req.DataClassification == "" {
		h.respondError(w, http.StatusBadRequest, "Tool name and data classification are required")
		return
	}

	asset := models.AIAsset{
		WorkspaceID:        workspaceID,
		ToolName:           req.ToolName,
		VendorID:           req.VendorID,
		BusinessPurpose:    req.BusinessPurpose,
		DataClassification: req.DataClassification,
		ApprovalStatus:     "under_review",
	}

	err := h.repo.CreateAIAsset(r.Context(), &asset)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Trigger warning warning flag in response if Restricted/PII classification
	var warning string
	if req.DataClassification == "Restricted/PII" {
		warning = "Data classification set to Restricted/PII. Standard data privacy policies (NDPR) legally require a cross-border Data Transfer mapping record if this tool hosts servers outside Nigeria."
	}

	response := map[string]interface{}{
		"asset": asset,
	}
	if warning != "" {
		response["warning"] = warning
	}

	h.respondJSON(w, http.StatusCreated, response)
}

// UpdateAIAssetApproval handles PATCH /workspaces/:id/ai-assets/:asset_id
func (h *Handler) UpdateAIAssetApproval(w http.ResponseWriter, r *http.Request) {
	assetID := chi.URLParam(r, "asset_id")
	var req struct {
		ApprovalStatus     string `json:"approval_status"`     // 'approved', 'rejected'
		DataClassification string `json:"data_classification"` // optional
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	err := h.repo.UpdateAIAssetApproval(r.Context(), assetID, req.ApprovalStatus, req.DataClassification)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "AI Governance parameters updated successfully"})
}

// GetDataTransfers handles GET /workspaces/:id/data-transfers
func (h *Handler) GetDataTransfers(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	list, err := h.repo.ListDataTransfers(r.Context(), workspaceID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, list)
}

// CreateDataTransfer handles POST /workspaces/:id/data-transfers
func (h *Handler) CreateDataTransfer(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	var req struct {
		VendorID           *string  `json:"vendor_id"`
		OriginCountry      string   `json:"origin_country"`
		DestinationCountry string   `json:"destination_country"`
		DataCategories     []string `json:"data_categories"`
		LegalBasis         *string  `json:"legal_basis"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.DestinationCountry == "" || len(req.DataCategories) == 0 {
		h.respondError(w, http.StatusBadRequest, "Destination country and at least one data category are required")
		return
	}

	dt := models.DataTransfer{
		WorkspaceID:        workspaceID,
		VendorID:           req.VendorID,
		OriginCountry:      req.OriginCountry,
		DestinationCountry: req.DestinationCountry,
		DataCategories:     req.DataCategories,
		LegalBasis:         req.LegalBasis,
	}

	err := h.repo.CreateDataTransfer(r.Context(), &dt)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusCreated, dt)
}

// GetRegulatoryFilings handles GET /workspaces/:id/regulatory-filings
func (h *Handler) GetRegulatoryFilings(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	h.repo.SeedInitialFilings(r.Context(), workspaceID)

	list, err := h.repo.ListRegulatoryFilings(r.Context(), workspaceID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, list)
}

// SubmitRegulatoryFiling handles POST /workspaces/:id/regulatory-filings/:filing_id/submit
func (h *Handler) SubmitRegulatoryFiling(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	filingID := chi.URLParam(r, "filing_id")

	var req struct {
		FileURL string  `json:"file_url"` // Proof receipt file path/url
		DPOName *string `json:"dpo_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.FileURL == "" {
		h.respondError(w, http.StatusBadRequest, "Proof receipt file URL is required to finalize regulatory filing")
		return
	}

	filing, err := h.repo.GetRegulatoryFiling(r.Context(), filingID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Filing task not found")
		return
	}

	// 1. Fetch appropriate framework control mapping to bind evidence
	controlID, err := h.repo.GetAccessReviewControl(r.Context(), workspaceID)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "No framework control found to map filing evidence. Please activate a Framework first.")
		return
	}

	// 2. Insert manual filing receipt evidence
	ev := models.Evidence{
		ControlID:   controlID,
		WorkspaceID: workspaceID,
		Type:        "manual",
		FileURL:     &req.FileURL,
		Payload: map[string]interface{}{
			"regulatory_filing_id": filingID,
			"regulator":            filing.Regulator,
			"filing_year":          filing.FilingYear,
			"dpo_name":             req.DPOName,
		},
	}
	err = h.repo.InsertEvidence(r.Context(), &ev)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to submit filing proof to evidence catalog: "+err.Error())
		return
	}

	// 3. Mark filing complete in DB
	err = h.repo.SubmitRegulatoryFiling(r.Context(), filingID, ev.ID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to update filing status: "+err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":     "Regulatory filing submitted successfully",
		"evidence_id": ev.ID,
		"filing_id":   filingID,
	})
}
