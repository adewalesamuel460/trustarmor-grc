package handler

import (
	"encoding/json"
	"net/http"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/go-chi/chi/v5"
)

// ListTasks gets all remediation tasks with optional status and assignee filters
func (h *Handler) ListTasks(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		http.Error(w, "Missing workspace ID parameter", http.StatusBadRequest)
		return
	}

	status := r.URL.Query().Get("status")
	assigneeID := r.URL.Query().Get("assignee_id")

	tasks, err := h.repo.ListTasks(r.Context(), workspaceID, status, assigneeID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tasks)
}

// UpdateTaskStatus patches task status and registers resolved timestamp
func (h *Handler) UpdateTaskStatus(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Status string `json:"status"` // 'todo', 'in_progress', 'in_review', 'done'
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	taskID := chi.URLParam(r, "task_id")
	if taskID == "" {
		http.Error(w, "Missing task ID parameter", http.StatusBadRequest)
		return
	}

	if input.Status != "todo" && input.Status != "in_progress" && input.Status != "in_review" && input.Status != "done" {
		http.Error(w, "Invalid status state. Must be: todo, in_progress, in_review, done", http.StatusBadRequest)
		return
	}

	err := h.repo.UpdateTaskStatus(r.Context(), taskID, input.Status)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Task status updated successfully"})
}

// CreateNotificationRule configures trigger event alert routes
func (h *Handler) CreateNotificationRule(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		http.Error(w, "Missing workspace ID parameter", http.StatusBadRequest)
		return
	}

	var input models.NotificationRule
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if input.TriggerEvent == "" || input.ActionType == "" || input.TargetDestination == "" {
		http.Error(w, "Missing required fields (trigger_event, action_type, target_destination)", http.StatusBadRequest)
		return
	}

	input.WorkspaceID = workspaceID
	err := h.repo.CreateNotificationRule(r.Context(), &input)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(input)
}

// ListNotificationRules retrieves configured alerts
func (h *Handler) ListNotificationRules(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		http.Error(w, "Missing workspace ID parameter", http.StatusBadRequest)
		return
	}

	rules, err := h.repo.ListNotificationRules(r.Context(), workspaceID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rules)
}

// DeleteNotificationRule removes alert configuration
func (h *Handler) DeleteNotificationRule(w http.ResponseWriter, r *http.Request) {
	ruleID := chi.URLParam(r, "rule_id")
	if ruleID == "" {
		http.Error(w, "Missing rule ID parameter", http.StatusBadRequest)
		return
	}

	err := h.repo.DeleteNotificationRule(r.Context(), ruleID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Notification rule deleted successfully"})
}

// GetReportsPosture returns aggregated readiness % across active frameworks
func (h *Handler) GetReportsPosture(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		http.Error(w, "Missing workspace ID parameter", http.StatusBadRequest)
		return
	}

	posture, err := h.repo.GetFrameworkCompliancePosture(r.Context(), workspaceID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"readiness_percentage": posture,
	})
}

// GetReportsMTTR calculates average remediation hours over past 30 days
func (h *Handler) GetReportsMTTR(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		http.Error(w, "Missing workspace ID", http.StatusBadRequest)
		return
	}

	mttrHours, err := h.repo.GetMTTRAverage(r.Context(), workspaceID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"mean_time_to_remediate_hours": mttrHours,
	})
}

// GetReportsSummaryWidgets gets count stats for dashboard cards
func (h *Handler) GetReportsSummaryWidgets(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		http.Error(w, "Missing workspace ID", http.StatusBadRequest)
		return
	}

	widgets, err := h.repo.GetExecutiveSummaryWidgets(r.Context(), workspaceID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(widgets)
}
