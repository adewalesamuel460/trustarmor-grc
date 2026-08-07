package handler

import (
	"encoding/json"
	"net/http"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/middleware"
)

// GetProfile returns the authenticated user's profile information
func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	profile, err := h.svc.GetProfile(r.Context(), userID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, profile)
}

// ChangePassword updates the authenticated user's password after verifying the current one
func (h *Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.CurrentPassword == "" || req.NewPassword == "" {
		h.respondError(w, http.StatusBadRequest, "current_password and new_password are required")
		return
	}

	if err := h.svc.ChangePassword(r.Context(), userID, req.CurrentPassword, req.NewPassword); err != nil {
		h.respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "Password changed successfully"})
}

// UpdateOnboarding handles PATCH /users/me/onboarding to set onboarding status
func (h *Handler) UpdateOnboarding(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		h.respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		HasSeenOnboarding bool `json:"has_seen_onboarding"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := h.svc.UpdateOnboarding(r.Context(), userID, req.HasSeenOnboarding); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]any{
		"message":             "Onboarding status updated",
		"has_seen_onboarding": req.HasSeenOnboarding,
	})
}

