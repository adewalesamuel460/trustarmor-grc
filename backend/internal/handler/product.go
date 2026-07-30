package handler

import (
	"encoding/json"
	"net/http"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/middleware"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/go-chi/chi/v5"
)

// GetProducts handles GET /workspaces/{id}/products
func (h *Handler) GetProducts(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	products, err := h.svc.GetProducts(r.Context(), workspaceID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, products)
}

// CreateProduct handles POST /workspaces/{id}/products
func (h *Handler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	var req struct {
		Suite       string `json:"suite"`
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" {
		h.respondError(w, http.StatusBadRequest, "Product Name is required")
		return
	}

	if req.Suite == "" {
		req.Suite = "General"
	}


	p := models.Product{
		WorkspaceID: workspaceID,
		Suite:       req.Suite,
		Name:        req.Name,
		Description: req.Description,
	}

	actorID := middleware.GetUserID(r.Context())
	ipAddress := r.RemoteAddr

	err := h.svc.CreateProduct(r.Context(), &p, actorID, ipAddress)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusCreated, p)
}

// GetProductPosture handles GET /workspaces/{id}/products/{productId}/posture
func (h *Handler) GetProductPosture(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	productID := chi.URLParam(r, "productId")
	if productID == "" {
		productID = chi.URLParam(r, "product_id")
	}
	if productID == "" {
		h.respondError(w, http.StatusBadRequest, "Product ID is required")
		return
	}

	posture, err := h.svc.GetProductPosture(r.Context(), workspaceID, productID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, posture)
}

// GetProductDetail handles GET /workspaces/{id}/products/{productId}
func (h *Handler) GetProductDetail(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	productID := chi.URLParam(r, "productId")
	if productID == "" {
		productID = chi.URLParam(r, "product_id")
	}
	if productID == "" {
		h.respondError(w, http.StatusBadRequest, "Product ID is required")
		return
	}

	posture, err := h.svc.GetProductPosture(r.Context(), workspaceID, productID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	controls, err := h.svc.GetProductControls(r.Context(), workspaceID, productID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]interface{}{
		"posture":  posture,
		"controls": controls,
	})
}

// LinkControlProducts handles POST /controls/{controlId}/products and POST /workspaces/{id}/controls/{controlId}/products
func (h *Handler) LinkControlProducts(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	controlID := chi.URLParam(r, "controlId")
	if controlID == "" {
		controlID = chi.URLParam(r, "control_id")
	}
	if controlID == "" {
		h.respondError(w, http.StatusBadRequest, "Control ID is required")
		return
	}

	var req struct {
		ProductIDs []string `json:"product_ids"`
		Coverage   string   `json:"coverage"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	actorID := middleware.GetUserID(r.Context())
	ipAddress := r.RemoteAddr

	err := h.svc.LinkControlProducts(r.Context(), workspaceID, controlID, req.ProductIDs, req.Coverage, actorID, ipAddress)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]string{"message": "Control product mappings updated successfully"})
}
