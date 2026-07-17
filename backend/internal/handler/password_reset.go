package handler

import (
	"encoding/json"
	"net/http"
	"strings"
)

// ForgotPassword handles POST /auth/forgot-password
// Accepts an email, generates a reset token, and (in dev) returns the token directly.
// In production, sends the reset link via email and returns only a generic success message.
func (h *Handler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	if req.Email == "" {
		h.respondError(w, http.StatusBadRequest, "Email is required")
		return
	}

	devToken, err := h.svc.RequestPasswordReset(r.Context(), req.Email)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	resp := map[string]any{
		"message": "If an account with that email exists, a password reset link has been sent.",
	}

	// In dev mode (no SMTP), include the reset token directly in the response
	// so developers can test without setting up email infrastructure.
	if devToken != "" {
		resp["dev_reset_token"] = devToken
		resp["dev_note"] = "DEVELOPMENT MODE: No SMTP configured. Use this token to reset your password."
	}

	h.respondJSON(w, http.StatusOK, resp)
}

// ResetPassword handles POST /auth/reset-password
// Accepts a token + new password, validates the token, and updates the password.
func (h *Handler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token       string `json:"token"`
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	req.Token = strings.TrimSpace(req.Token)
	if req.Token == "" || req.NewPassword == "" {
		h.respondError(w, http.StatusBadRequest, "token and new_password are required")
		return
	}

	if err := h.svc.ResetPassword(r.Context(), req.Token, req.NewPassword); err != nil {
		h.respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{
		"message": "Password reset successfully. Please sign in with your new password.",
	})
}
