package handler

import (
	"encoding/json"
	"net/http"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/middleware"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/go-chi/chi/v5"
)

// GetRisks handles GET /workspaces/:workspace_id/risks
func (h *Handler) GetRisks(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	risks, err := h.repo.GetRisks(r.Context(), workspaceID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, risks)
}

// CreateRisk handles POST /workspaces/:workspace_id/risks
func (h *Handler) CreateRisk(w http.ResponseWriter, r *http.Request) {
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
		Category    string  `json:"category"`
		Likelihood  int     `json:"likelihood"`
		Impact      int     `json:"impact"`
		OwnerID     *string `json:"owner_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Title == "" {
		h.respondError(w, http.StatusBadRequest, "Risk title is required")
		return
	}
	if req.Likelihood < 1 || req.Likelihood > 5 || req.Impact < 1 || req.Impact > 5 {
		h.respondError(w, http.StatusBadRequest, "Likelihood and Impact must be between 1 and 5")
		return
	}

	risk := models.Risk{
		WorkspaceID: workspaceID,
		Title:       req.Title,
		Description: req.Description,
		Category:    req.Category,
		Likelihood:  req.Likelihood,
		Impact:      req.Impact,
		OwnerID:     req.OwnerID,
	}

	err := h.repo.CreateRisk(r.Context(), &risk)
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
		"risk.created",
		"risk",
		risk.ID,
		nil,
		map[string]interface{}{"title": risk.Title, "score": risk.InherentScore},
		ipAddress,
	)

	h.respondJSON(w, http.StatusCreated, risk)
}

// UpdateRisk handles PATCH /workspaces/:workspace_id/risks/:risk_id
func (h *Handler) UpdateRisk(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	riskID := chi.URLParam(r, "risk_id")
	if riskID == "" {
		h.respondError(w, http.StatusBadRequest, "Risk ID is required")
		return
	}

	oldRisk, err := h.repo.GetRiskByID(r.Context(), riskID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Risk not found")
		return
	}

	if oldRisk.WorkspaceID != workspaceID {
		h.respondError(w, http.StatusForbidden, "Access denied")
		return
	}

	var req struct {
		Title       string  `json:"title"`
		Description string  `json:"description"`
		Category    string  `json:"category"`
		Likelihood  int     `json:"likelihood"`
		Impact      int     `json:"impact"`
		Status      string  `json:"status"`
		OwnerID     *string `json:"owner_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Capture transitions
	oldLikelihood := oldRisk.Likelihood
	oldImpact := oldRisk.Impact
	oldScore := oldRisk.InherentScore

	if req.Title != "" {
		oldRisk.Title = req.Title
	}
	oldRisk.Description = req.Description
	if req.Category != "" {
		oldRisk.Category = req.Category
	}
	if req.Likelihood >= 1 && req.Likelihood <= 5 {
		oldRisk.Likelihood = req.Likelihood
	}
	if req.Impact >= 1 && req.Impact <= 5 {
		oldRisk.Impact = req.Impact
	}
	if req.Status != "" {
		oldRisk.Status = req.Status
	}
	oldRisk.OwnerID = req.OwnerID

	// Recalculates score internally
	err = h.repo.UpdateRisk(r.Context(), oldRisk)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit risk update
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

	// Auditing transitions on likelihood/impact changes
	if oldLikelihood != oldRisk.Likelihood || oldImpact != oldRisk.Impact {
		metadata := map[string]interface{}{
			"title":          oldRisk.Title,
			"old_likelihood": oldLikelihood,
			"new_likelihood": oldRisk.Likelihood,
			"old_impact":     oldImpact,
			"new_impact":     oldRisk.Impact,
			"old_value":      oldScore,
			"new_value":      oldRisk.InherentScore,
		}

		h.auditSvc.LogEvent(
			workspaceID,
			actorIDPtr,
			actorEmail,
			"risk.severity_updated",
			"risk",
			oldRisk.ID,
			oldScore,
			metadata,
			ipAddress,
		)
	} else {
		h.auditSvc.LogEvent(
			workspaceID,
			actorIDPtr,
			actorEmail,
			"risk.updated",
			"risk",
			oldRisk.ID,
			nil,
			map[string]interface{}{"title": oldRisk.Title},
			ipAddress,
		)
	}

	h.respondJSON(w, http.StatusOK, oldRisk)
}

// AddTreatment handles POST /workspaces/:workspace_id/risks/:risk_id/treatments
func (h *Handler) AddTreatment(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	riskID := chi.URLParam(r, "risk_id")
	if riskID == "" {
		h.respondError(w, http.StatusBadRequest, "Risk ID is required")
		return
	}

	// Verify risk exists
	_, err := h.repo.GetRiskByID(r.Context(), riskID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Risk not found")
		return
	}

	var req struct {
		Strategy    string  `json:"strategy"`
		Description string  `json:"description"`
		TargetDate  *string `json:"target_date"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Strategy == "" || req.Description == "" {
		h.respondError(w, http.StatusBadRequest, "Strategy and Description are required")
		return
	}

	t := models.RiskTreatment{
		RiskID:      riskID,
		Strategy:    req.Strategy,
		Description: req.Description,
		TargetDate:  req.TargetDate,
	}

	err = h.repo.AddTreatment(r.Context(), &t)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit treatment log
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
		"risk.treatment_added",
		"risk_treatment",
		t.ID,
		nil,
		map[string]interface{}{"strategy": t.Strategy},
		ipAddress,
	)

	h.respondJSON(w, http.StatusCreated, t)
}

// MapRiskControls handles POST /workspaces/:workspace_id/risks/:risk_id/map-controls
func (h *Handler) MapRiskControls(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	riskID := chi.URLParam(r, "risk_id")
	if riskID == "" {
		h.respondError(w, http.StatusBadRequest, "Risk ID is required")
		return
	}

	// Verify risk exists
	_, err := h.repo.GetRiskByID(r.Context(), riskID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Risk not found")
		return
	}

	var req struct {
		ControlIDs []string `json:"control_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	err = h.repo.MapRiskControls(r.Context(), riskID, req.ControlIDs)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit control mapping
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
		"risk.controls_mapped",
		"risk",
		riskID,
		nil,
		map[string]interface{}{"controls_count": len(req.ControlIDs)},
		ipAddress,
	)

	h.respondJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Controls mapped to risk successfully",
	})
}

// GetRiskHeatmap handles GET /workspaces/:workspace_id/risks/heatmap
func (h *Handler) GetRiskHeatmap(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	cells, err := h.repo.GetRiskHeatmap(r.Context(), workspaceID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, cells)
}
