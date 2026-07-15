package handler

import (
	"net/http"
	"time"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/middleware"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/go-chi/chi/v5"
)

// UploadEvidence handles POST /workspaces/:workspace_id/controls/:control_id/evidence/upload
func (h *Handler) UploadEvidence(w http.ResponseWriter, r *http.Request) {
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

	// 1. Fetch control to verify tenant access and read current status
	ctrl, err := h.repo.GetControlByID(r.Context(), controlID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Control not found")
		return
	}
	if ctrl.WorkspaceID != workspaceID {
		h.respondError(w, http.StatusForbidden, "Access to control denied")
		return
	}

	// 2. Parse multipart form file (limit 10MB)
	err = r.ParseMultipartForm(10 << 20)
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

	// Parse optional expiration date
	var expiresAt *time.Time
	if expiresAtVal := r.FormValue("expires_at"); expiresAtVal != "" {
		t, err := time.Parse(time.RFC3339, expiresAtVal)
		if err == nil {
			expiresAt = &t
		} else {
			// Fallback parse just date
			t, err = time.Parse("2006-01-02", expiresAtVal)
			if err == nil {
				expiresAt = &t
			}
		}
	}

	// 3. Upload file using StorageService
	fileURL, err := h.storageSvc.Upload(r.Context(), header.Filename, file)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to upload file: "+err.Error())
		return
	}

	// 4. Save evidence record
	evidence := models.Evidence{
		ControlID:   controlID,
		WorkspaceID: workspaceID,
		Type:        "manual",
		FileURL:     &fileURL,
		ExpiresAt:   expiresAt,
	}
	err = h.repo.InsertEvidence(r.Context(), &evidence)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to save evidence log: "+err.Error())
		return
	}

	// 5. Audit log manual evidence upload (Phase 2 integration)
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
		"evidence.uploaded",
		"evidence",
		evidence.ID,
		nil,
		map[string]interface{}{"file_name": header.Filename, "file_url": fileURL},
		ipAddress,
	)

	// 6. Set status to passing
	previousStatus := ctrl.CurrentStatus
	newStatus := "passing"
	if previousStatus != newStatus {
		err = h.repo.UpdateControlStatus(r.Context(), controlID, newStatus, time.Now())
		if err != nil {
			h.respondError(w, http.StatusInternalServerError, "Failed to update control status: "+err.Error())
			return
		}

		reason := "Manual evidence uploaded: " + header.Filename
		statusLog := models.ControlStatusLog{
			ControlID:      controlID,
			PreviousStatus: &previousStatus,
			NewStatus:      newStatus,
			Reason:         &reason,
		}
		err = h.repo.CreateControlStatusLog(r.Context(), &statusLog)
		if err != nil {
			h.respondError(w, http.StatusInternalServerError, "Failed to write status transition log: "+err.Error())
			return
		}

		// Audit log control status transition
		h.auditSvc.LogEvent(
			workspaceID,
			actorIDPtr,
			actorEmail,
			"control.status_changed",
			"control",
			controlID,
			&previousStatus,
			&newStatus,
			ipAddress,
		)
	}

	h.respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":      "Evidence uploaded successfully",
		"evidence_id":  evidence.ID,
		"file_url":     fileURL,
		"ctrl_status":  newStatus,
	})
}

// GetEvidenceLists handles GET /workspaces/:workspace_id/controls/:control_id/evidence
func (h *Handler) GetEvidenceLists(w http.ResponseWriter, r *http.Request) {
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

	// Verify tenant access
	ctrl, err := h.repo.GetControlByID(r.Context(), controlID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Control not found")
		return
	}
	if ctrl.WorkspaceID != workspaceID {
		h.respondError(w, http.StatusForbidden, "Access denied")
		return
	}

	evidence, err := h.repo.GetEvidenceList(r.Context(), controlID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, evidence)
}

// GetControlStatusLogs handles GET /workspaces/:workspace_id/controls/:control_id/status-logs
func (h *Handler) GetControlStatusLogs(w http.ResponseWriter, r *http.Request) {
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

	// Verify access
	ctrl, err := h.repo.GetControlByID(r.Context(), controlID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Control not found")
		return
	}
	if ctrl.WorkspaceID != workspaceID {
		h.respondError(w, http.StatusForbidden, "Access denied")
		return
	}

	logs, err := h.repo.GetControlStatusLogs(r.Context(), controlID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, logs)
}

// EvaluateControl handles POST /workspaces/:workspace_id/controls/:control_id/evaluate
func (h *Handler) EvaluateControl(w http.ResponseWriter, r *http.Request) {
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

	// Verify control belongs to active workspace
	ctrl, err := h.repo.GetControlByID(r.Context(), controlID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Control not found")
		return
	}
	if ctrl.WorkspaceID != workspaceID {
		h.respondError(w, http.StatusForbidden, "Access denied")
		return
	}

	// 1. Enqueue evaluation background task
	err = h.worker.EnqueueEvaluateControl(controlID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to enqueue evaluation background task: "+err.Error())
		return
	}

	// 2. Audit log evaluation request (Phase 2 integration)
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
		"control.evaluation_triggered",
		"control",
		controlID,
		nil,
		nil,
		ipAddress,
	)

	// 3. Return 202 Accepted immediately
	h.respondJSON(w, http.StatusAccepted, map[string]interface{}{
		"message":     "Control evaluation enqueued successfully",
		"eval_status": "pending",
	})
}
