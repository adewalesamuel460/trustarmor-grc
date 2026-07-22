package handler

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/smtp"
	"os"
	"time"

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

// SendTestNotification sends or logs a test alert email
func (h *Handler) SendTestNotification(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		http.Error(w, "Missing workspace ID parameter", http.StatusBadRequest)
		return
	}

	var req struct {
		RecipientEmail string `json:"recipient_email"`
		TriggerEvent   string `json:"trigger_event"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.RecipientEmail == "" {
		http.Error(w, "Recipient email is required", http.StatusBadRequest)
		return
	}

	if req.TriggerEvent == "" {
		req.TriggerEvent = "control.failed"
	}

	eventTitle := "Failing Compliance Control"
	switch req.TriggerEvent {
	case "vendor.document_expiring":
		eventTitle = "Vendor Document Expiration Warning"
	case "task.overdue":
		eventTitle = "Remediation Task Overdue Alert"
	}

	subject := fmt.Sprintf("🚨 [TrustArmor Alert] Test Notification: %s", eventTitle)
	bodyText := fmt.Sprintf("Hello Security Owner,\n\nThis is a test alert notification dispatched from your TrustArmor GRC tenant settings.\n\nAlert Routing Details:\n- Trigger Event: %s (%s)\n- Recipient Email: %s\n- Dispatch Time: %s\n- Status: VERIFIED & OPERATIONAL\n\nIf you are receiving this message, your alert notification channel is working as expected.\n\n— TrustArmor GRC Security Operations Team", eventTitle, req.TriggerEvent, req.RecipientEmail, time.Now().Format(time.RFC1123))

	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASSWORD")
	fromAddr := os.Getenv("SMTP_FROM")

	if smtpPort == "" {
		smtpPort = "587"
	}
	if fromAddr == "" {
		fromAddr = "alerts@trustarmor.io"
	}

	w.Header().Set("Content-Type", "application/json")

	if smtpHost != "" {
		// Live SMTP sending
		msg := fmt.Sprintf("From: TrustArmor Alerts <%s>\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
			fromAddr, req.RecipientEmail, subject, bodyText)
		auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)
		err := smtp.SendMail(smtpHost+":"+smtpPort, auth, fromAddr, []string{req.RecipientEmail}, []byte(msg))
		if err != nil {
			http.Error(w, fmt.Sprintf("SMTP Error sending email to %s: %v", req.RecipientEmail, err), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "sent",
			"mode":    "smtp",
			"message": fmt.Sprintf("Test alert email sent successfully via SMTP to %s", req.RecipientEmail),
			"details": map[string]string{
				"recipient": req.RecipientEmail,
				"subject":   subject,
				"sender":    fromAddr,
			},
		})
		return
	}

	// Dev Mode Fallback: Log to console & return preview details
	log.Printf("\n=======================================================")
	log.Printf("  TEST ALERT EMAIL DISPATCHED (DEV FALLBACK)")
	log.Printf("  To     : %s", req.RecipientEmail)
	log.Printf("  Subject: %s", subject)
	log.Printf("  Body   :\n%s", bodyText)
	log.Printf("=======================================================\n")

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"mode":    "dev_console",
		"message": fmt.Sprintf("Test alert email dispatched for %s (Logged to dev console. Set SMTP_HOST in .env for live email server delivery).", req.RecipientEmail),
		"details": map[string]string{
			"recipient": req.RecipientEmail,
			"subject":   subject,
			"sender":    fromAddr,
			"preview":   bodyText,
		},
	})
}
