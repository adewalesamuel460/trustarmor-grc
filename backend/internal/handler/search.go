package handler

import (
	"net/http"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/middleware"
	"github.com/go-chi/chi/v5"
)

// Search handles GET /workspaces/:id/search?q=query
func (h *Handler) GlobalSearch(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}
	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	query := r.URL.Query().Get("q")
	results, err := h.repo.GlobalSearch(r.Context(), workspaceID, query)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, results)
}
