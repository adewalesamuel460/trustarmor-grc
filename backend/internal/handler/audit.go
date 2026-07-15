package handler

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/middleware"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/repository"
	"github.com/go-chi/chi/v5"
)

// GetAuditLogs handles GET /workspaces/{id}/audit-logs with query-based filtering and pagination
func (h *Handler) GetAuditLogs(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	// Parse query parameters
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	page := 1
	limit := 20

	if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
		page = p
	}
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
		limit = l
	}

	offset := (page - 1) * limit

	// Build filter
	filters := h.parseAuditFilters(r)

	// Fetch logs
	logs, err := h.svc.GetAuditLogs(r.Context(), workspaceID, filters, limit, offset)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to get audit logs: %v", err))
		return
	}

	// Fetch total count for pagination metadata
	total, err := h.svc.CountAuditLogs(r.Context(), workspaceID, filters)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to count audit logs: %v", err))
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]interface{}{
		"logs":  logs,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// ExportAuditLogs handles GET /workspaces/{id}/audit-logs/export and outputs a standard CSV download
func (h *Handler) ExportAuditLogs(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	// Parse query filters
	filters := h.parseAuditFilters(r)

	// Fetch logs (fetch a large amount for export, e.g. up to 1000 logs)
	logs, err := h.svc.GetAuditLogs(r.Context(), workspaceID, filters, 1000, 0)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to fetch export logs: %v", err))
		return
	}

	// Configure response headers for download
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=audit_logs_%s.csv", time.Now().Format("20060102_150405")))

	writer := csv.NewWriter(w)
	defer writer.Flush()

	// Write CSV headers
	headers := []string{"ID", "Timestamp", "Actor Email", "Action", "Resource Type", "Resource ID", "IP Address", "Old Value", "New Value"}
	if err := writer.Write(headers); err != nil {
		return
	}

	// Write CSV rows
	for _, l := range logs {
		actorEmail := ""
		if l.ActorEmail != nil {
			actorEmail = *l.ActorEmail
		}

		oldJSON, _ := json.Marshal(l.OldValue)
		newJSON, _ := json.Marshal(l.NewValue)

		row := []string{
			l.ID,
			l.CreatedAt.Format(time.RFC3339),
			actorEmail,
			l.Action,
			l.ResourceType,
			l.ResourceID,
			l.IPAddress,
			string(oldJSON),
			string(newJSON),
		}

		if err := writer.Write(row); err != nil {
			return
		}
	}
}

// Helper to parse query parameters into AuditFilter structure
func (h *Handler) parseAuditFilters(r *http.Request) repository.AuditFilter {
	var filters repository.AuditFilter

	filters.Action = r.URL.Query().Get("action")
	filters.ActorEmail = r.URL.Query().Get("actor_email")

	if val := r.URL.Query().Get("start_date"); val != "" {
		if t, err := time.Parse(time.RFC3339, val); err == nil {
			filters.StartDate = &t
		} else if t, err := time.Parse("2006-01-02", val); err == nil {
			// YYYY-MM-DD format (from input date pickers) starts at the beginning of the day
			filters.StartDate = &t
		}
	}

	if val := r.URL.Query().Get("end_date"); val != "" {
		if t, err := time.Parse(time.RFC3339, val); err == nil {
			filters.EndDate = &t
		} else if t, err := time.Parse("2006-01-02", val); err == nil {
			// YYYY-MM-DD format ends at the last second of that day
			endOfDay := t.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
			filters.EndDate = &endOfDay
		}
	}

	return filters
}
