package service

import (
	"context"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
)

// GetProducts retrieves all products registered for a workspace
func (s *Service) GetProducts(ctx context.Context, workspaceID string) ([]models.Product, error) {
	return s.repo.GetProducts(ctx, workspaceID)
}

// CreateProduct creates a new product for a workspace and records an audit log
func (s *Service) CreateProduct(ctx context.Context, p *models.Product, actorID, ipAddress string) error {
	err := s.repo.CreateProduct(ctx, p)
	if err != nil {
		return err
	}

	var actorEmail *string
	var actorIDPtr *string
	if actorID != "" {
		actorIDPtr = &actorID
		user, err := s.repo.GetUserByID(ctx, actorID)
		if err == nil {
			actorEmail = &user.Email
		}
	}

	s.auditSvc.LogEvent(
		p.WorkspaceID,
		actorIDPtr,
		actorEmail,
		"product.created",
		"product",
		p.ID,
		nil,
		map[string]interface{}{"id": p.ID, "name": p.Name, "suite": p.Suite, "description": p.Description},
		ipAddress,
	)

	return nil
}

// GetProductByID retrieves a single product by ID
func (s *Service) GetProductByID(ctx context.Context, workspaceID string, productID string) (models.Product, error) {
	return s.repo.GetProductByID(ctx, workspaceID, productID)
}

// GetProductPosture returns the compliance posture per activated framework for a product
func (s *Service) GetProductPosture(ctx context.Context, workspaceID string, productID string) (models.ProductPosture, error) {
	return s.repo.GetProductPosture(ctx, workspaceID, productID)
}

// LinkControlProducts links a control to one or more products and records an audit log
func (s *Service) LinkControlProducts(ctx context.Context, workspaceID, controlID string, productIDs []string, coverage, actorID, ipAddress string) error {
	err := s.repo.LinkControlProducts(ctx, controlID, productIDs, coverage)
	if err != nil {
		return err
	}

	var actorEmail *string
	var actorIDPtr *string
	if actorID != "" {
		actorIDPtr = &actorID
		user, err := s.repo.GetUserByID(ctx, actorID)
		if err == nil {
			actorEmail = &user.Email
		}
	}

	s.auditSvc.LogEvent(
		workspaceID,
		actorIDPtr,
		actorEmail,
		"control_products.updated",
		"control",
		controlID,
		nil,
		map[string]interface{}{"control_id": controlID, "product_ids": productIDs, "coverage": coverage},
		ipAddress,
	)

	return nil
}

// GetProductControls retrieves all controls linked to a product
func (s *Service) GetProductControls(ctx context.Context, workspaceID string, productID string) ([]models.ProductControlDetail, error) {
	return s.repo.GetProductControls(ctx, workspaceID, productID)
}
