package handler

import (
	"encoding/json"
	"net/http"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/middleware"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/repository"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/service"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	svc        *service.Service
	auditSvc   *service.AuditService
	encryptSvc *service.EncryptionService
	worker     *service.Worker
	storageSvc service.StorageService
	repo       *repository.Repository
}

func New(
	svc *service.Service,
	auditSvc *service.AuditService,
	encryptSvc *service.EncryptionService,
	worker *service.Worker,
	storageSvc service.StorageService,
	repo *repository.Repository,
) *Handler {
	return &Handler{
		svc:        svc,
		auditSvc:   auditSvc,
		encryptSvc: encryptSvc,
		worker:     worker,
		storageSvc: storageSvc,
		repo:       repo,
	}
}

// Helpers for reading/writing JSON
func (h *Handler) respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func (h *Handler) respondError(w http.ResponseWriter, status int, message string) {
	h.respondJSON(w, status, map[string]string{"error": message})
}

// Auth handlers
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email            string `json:"email"`
		Password         string `json:"password"`
		OrganizationName string `json:"organization_name"`
		WorkspaceName    string `json:"workspace_name"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Email == "" || req.Password == "" || req.OrganizationName == "" || req.WorkspaceName == "" {
		h.respondError(w, http.StatusBadRequest, "Missing required fields")
		return
	}

	res, err := h.svc.Register(r.Context(), req.Email, req.Password, req.OrganizationName, req.WorkspaceName)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusCreated, res)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	res, err := h.svc.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		h.respondError(w, http.StatusUnauthorized, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, res)
}

func (h *Handler) VerifyMFA(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
		Code  string `json:"code"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	res, err := h.svc.VerifyMFA(r.Context(), req.Email, req.Code)
	if err != nil {
		h.respondError(w, http.StatusUnauthorized, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, res)
}

func (h *Handler) SetupMFA(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	secret, keyURL, err := h.svc.SetupMFA(r.Context(), userID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{
		"secret":  secret,
		"key_url": keyURL,
	})
}

func (h *Handler) ConfirmMFA(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var req struct {
		Code string `json:"code"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	err := h.svc.ConfirmMFA(r.Context(), userID, req.Code)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "MFA enabled successfully"})
}

func (h *Handler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	access, refresh, err := h.svc.RefreshToken(req.RefreshToken)
	if err != nil {
		h.respondError(w, http.StatusUnauthorized, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{
		"access_token":  access,
		"refresh_token": refresh,
	})
}

// Workspace handlers
func (h *Handler) GetWorkspaces(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	workspaces, err := h.repo.GetUserWorkspaces(r.Context(), userID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, workspaces)
}

func (h *Handler) CreateWorkspace(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var req struct {
		Name string `json:"name"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace name is required")
		return
	}

	ws, err := h.svc.CreateWorkspace(r.Context(), userID, req.Name)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusCreated, ws)
}

func (h *Handler) GetWorkspaceMembers(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	members, err := h.svc.GetWorkspaceMembers(r.Context(), workspaceID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, members)
}

func (h *Handler) InviteMember(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	var req struct {
		Email string `json:"email"`
		Role  string `json:"role"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Email == "" || req.Role == "" {
		h.respondError(w, http.StatusBadRequest, "Email and Role are required")
		return
	}

	actorID := middleware.GetUserID(r.Context())
	err := h.svc.InviteUser(r.Context(), actorID, workspaceID, req.Email, req.Role)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "User invited successfully"})
}
