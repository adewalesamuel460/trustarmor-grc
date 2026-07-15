package handler

import (
	"encoding/json"
	"net/http"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/middleware"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/go-chi/chi/v5"
)

// CreateAuditRun handles POST /workspaces/:workspace_id/audits
func (h *Handler) CreateAuditRun(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	var req struct {
		Name        string `json:"name"`
		FrameworkID string `json:"framework_id"`
		AuditorFirm string `json:"auditor_firm"`
		StartDate   string `json:"start_date"`
		EndDate     string `json:"end_date"`
		Status      string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" || req.FrameworkID == "" {
		h.respondError(w, http.StatusBadRequest, "name and framework_id fields are required")
		return
	}

	run := models.AuditRun{
		WorkspaceID: workspaceID,
		Name:        req.Name,
		FrameworkID: req.FrameworkID,
		AuditorFirm: req.AuditorFirm,
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		Status:      req.Status,
	}

	err := h.repo.CreateAuditRun(r.Context(), &run)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit Log
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
		"audit_run.created",
		"audit_run",
		run.ID,
		nil,
		map[string]interface{}{"name": run.Name},
		ipAddress,
	)

	h.respondJSON(w, http.StatusCreated, run)
}

// ListAuditRuns handles GET /workspaces/:workspace_id/audits
func (h *Handler) ListAuditRuns(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	userID := middleware.GetUserID(r.Context())
	roleName := middleware.GetRoleName(r.Context())

	var runs []models.AuditRun
	var err error

	if roleName == "Auditor" {
		runs, err = h.repo.ListAuditorRuns(r.Context(), workspaceID, userID)
	} else {
		runs, err = h.repo.ListAuditRuns(r.Context(), workspaceID)
	}

	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Populate progress metrics for each run
	for idx, run := range runs {
		total, acceptedPct, err := h.repo.GetAuditRunProgress(r.Context(), run.ID)
		if err == nil {
			runs[idx].RequestsCount = total
			runs[idx].AcceptedPercentage = acceptedPct
		}
	}

	h.respondJSON(w, http.StatusOK, runs)
}

// AddAuditor handles POST /workspaces/:workspace_id/audits/:id/auditors
func (h *Handler) AddAuditor(w http.ResponseWriter, r *http.Request) {
	runID := chi.URLParam(r, "id")
	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Email == "" {
		h.respondError(w, http.StatusBadRequest, "Email address is required")
		return
	}

	// Lookup user
	user, err := h.repo.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "User not found with requested email")
		return
	}

	err = h.repo.AddAuditorToRun(r.Context(), runID, user.ID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "Auditor assigned successfully"})
}

// GetAuditRunDetails handles GET /workspaces/:workspace_id/audits/:id
func (h *Handler) GetAuditRunDetails(w http.ResponseWriter, r *http.Request) {
	runID := chi.URLParam(r, "id")
	if runID == "" {
		h.respondError(w, http.StatusBadRequest, "Audit Run ID is required")
		return
	}

	run, err := h.repo.GetAuditRun(r.Context(), runID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Audit run not found")
		return
	}

	// Fetch statistics
	total, acceptedPct, err := h.repo.GetAuditRunProgress(r.Context(), runID)
	if err == nil {
		run.RequestsCount = total
		run.AcceptedPercentage = acceptedPct
	}

	// Fetch auditors list
	auditors, err := h.repo.GetAuditRunAuditors(r.Context(), runID)
	if err == nil {
		run.Auditors = auditors
	}

	// Fetch evidence requests list
	requests, err := h.repo.GetEvidenceRequests(r.Context(), runID)
	if err == nil {
		// Populate comments for each request
		for idx, req := range requests {
			comments, err := h.repo.GetAuditComments(r.Context(), req.ID)
			if err == nil {
				requests[idx].Comments = comments
			}
		}
		run.EvidenceRequests = requests
	}

	// Fetch eligible controls linked to framework
	controls, err := h.repo.GetFrameworkControls(r.Context(), run.FrameworkID, run.WorkspaceID)
	if err == nil {
		run.FrameworkControls = controls
	}

	h.respondJSON(w, http.StatusOK, run)
}

// CreateEvidenceRequest handles POST /workspaces/:workspace_id/audits/:id/requests
func (h *Handler) CreateEvidenceRequest(w http.ResponseWriter, r *http.Request) {
	runID := chi.URLParam(r, "id")
	var req struct {
		ControlID   string `json:"control_id"`
		Title       string `json:"title"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.ControlID == "" || req.Title == "" {
		h.respondError(w, http.StatusBadRequest, "control_id and title fields are required")
		return
	}

	evidenceReq := models.EvidenceRequest{
		AuditRunID:  runID,
		ControlID:   req.ControlID,
		Title:       req.Title,
		Description: req.Description,
	}

	err := h.repo.CreateEvidenceRequest(r.Context(), &evidenceReq)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusCreated, evidenceReq)
}

// SubmitEvidence handles POST /workspaces/:workspace_id/audits/requests/:req_id/submit
func (h *Handler) SubmitEvidence(w http.ResponseWriter, r *http.Request) {
	reqID := chi.URLParam(r, "req_id")
	var req struct {
		EvidenceID string `json:"evidence_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.EvidenceID == "" {
		h.respondError(w, http.StatusBadRequest, "evidence_id is required")
		return
	}

	err := h.repo.SubmitEvidence(r.Context(), reqID, req.EvidenceID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "Evidence submitted successfully"})
}

// ReviewEvidenceRequest handles POST /workspaces/:workspace_id/audits/requests/:req_id/review
func (h *Handler) ReviewEvidenceRequest(w http.ResponseWriter, r *http.Request) {
	reqID := chi.URLParam(r, "req_id")
	var req struct {
		Status string `json:"status"` // 'accepted' or 'rejected'
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Status != "accepted" && req.Status != "rejected" {
		h.respondError(w, http.StatusBadRequest, "status must be either 'accepted' or 'rejected'")
		return
	}

	err := h.repo.ReviewEvidenceRequest(r.Context(), reqID, req.Status)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "Evidence evaluation updated"})
}

// AddAuditComment handles POST /workspaces/:workspace_id/audits/requests/:req_id/comments
func (h *Handler) AddAuditComment(w http.ResponseWriter, r *http.Request) {
	reqID := chi.URLParam(r, "req_id")
	userID := middleware.GetUserID(r.Context())

	var req struct {
		Comment string `json:"comment"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Comment == "" {
		h.respondError(w, http.StatusBadRequest, "Comment cannot be empty")
		return
	}

	ac := models.AuditComment{
		EvidenceRequestID: reqID,
		UserID:            userID,
		Comment:           req.Comment,
	}

	err := h.repo.AddAuditComment(r.Context(), &ac)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusCreated, ac)
}

// GetAuditComments handles GET /workspaces/:workspace_id/audits/requests/:req_id/comments
func (h *Handler) GetAuditComments(w http.ResponseWriter, r *http.Request) {
	reqID := chi.URLParam(r, "req_id")
	comments, err := h.repo.GetAuditComments(r.Context(), reqID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, comments)
}
