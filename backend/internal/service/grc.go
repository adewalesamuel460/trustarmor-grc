package service

import (
	"context"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
)

// CreateFramework creates a new global compliance framework
func (s *Service) CreateFramework(ctx context.Context, f *models.Framework) error {
	return s.repo.CreateFramework(ctx, f)
}

// GetFrameworks retrieves all available global frameworks
func (s *Service) GetFrameworks(ctx context.Context) ([]models.Framework, error) {
	return s.repo.GetFrameworks(ctx)
}

// GetActivatedFrameworks retrieves activated frameworks for a workspace
func (s *Service) GetActivatedFrameworks(ctx context.Context, workspaceID string) ([]models.Framework, error) {
	return s.repo.GetActivatedFrameworks(ctx, workspaceID)
}

// ActivateFramework activates a compliance framework for a workspace and audit logs it
func (s *Service) ActivateFramework(ctx context.Context, workspaceID, frameworkID, actorID, ipAddress string) error {
	// 1. Activate in Repository
	err := s.repo.ActivateFramework(ctx, workspaceID, frameworkID)
	if err != nil {
		return err
	}

	// 2. Fetch actor details for audit logging
	var actorEmail *string
	var actorIDPtr *string
	if actorID != "" {
		actorIDPtr = &actorID
		user, err := s.repo.GetUserByID(ctx, actorID)
		if err == nil {
			actorEmail = &user.Email
		}
	}

	// 3. Write immutable audit log
	s.auditSvc.LogEvent(
		workspaceID,
		actorIDPtr,
		actorEmail,
		"framework.activated",
		"framework",
		frameworkID,
		nil,
		map[string]interface{}{"framework_id": frameworkID, "status": "active"},
		ipAddress,
	)

	return nil
}

// CreateControl defines a new internal compliance control and audit logs it
func (s *Service) CreateControl(ctx context.Context, c *models.Control, actorID, ipAddress string) error {
	// 1. Save in repository
	err := s.repo.CreateControl(ctx, c)
	if err != nil {
		return err
	}

	// 2. Fetch actor details for audit logging
	var actorEmail *string
	var actorIDPtr *string
	if actorID != "" {
		actorIDPtr = &actorID
		user, err := s.repo.GetUserByID(ctx, actorID)
		if err == nil {
			actorEmail = &user.Email
		}
	}

	// 3. Write immutable audit log
	s.auditSvc.LogEvent(
		c.WorkspaceID,
		actorIDPtr,
		actorEmail,
		"control.created",
		"control",
		c.ID,
		nil,
		c,
		ipAddress,
	)

	return nil
}

// GetControls retrieves workspace controls
func (s *Service) GetControls(ctx context.Context, workspaceID string) ([]models.Control, error) {
	return s.repo.GetControls(ctx, workspaceID)
}

// MapControl updates control mappings to framework requirements and audit logs it
func (s *Service) MapControl(ctx context.Context, workspaceID, controlID string, requirementIDs []string, actorID, ipAddress string) error {
	// 1. Fetch current mappings for audit logging oldValue
	var oldMappings []string
	rows, err := s.repo.GetControls(ctx, workspaceID)
	if err == nil {
		for _, c := range rows {
			if c.ID == controlID {
				oldMappings = c.MappedRequirements
				break
			}
		}
	}

	// 2. Update mapping in repository
	err = s.repo.MapControl(ctx, controlID, requirementIDs)
	if err != nil {
		return err
	}

	// 3. Fetch actor details for audit logging
	var actorEmail *string
	var actorIDPtr *string
	if actorID != "" {
		actorIDPtr = &actorID
		user, err := s.repo.GetUserByID(ctx, actorID)
		if err == nil {
			actorEmail = &user.Email
		}
	}

	// 4. Write immutable audit log
	s.auditSvc.LogEvent(
		workspaceID,
		actorIDPtr,
		actorEmail,
		"control_mapping.updated",
		"control",
		controlID,
		map[string]interface{}{"mapped_requirements": oldMappings},
		map[string]interface{}{"mapped_requirements": requirementIDs},
		ipAddress,
	)

	return nil
}

// GetCompliancePosture calculates compliance percentage for a framework in a workspace
func (s *Service) GetCompliancePosture(ctx context.Context, workspaceID, frameworkID string) (float64, error) {
	return s.repo.GetPosture(ctx, workspaceID, frameworkID)
}

// GetRequirements retrieves all available requirements globally
func (s *Service) GetRequirements(ctx context.Context) ([]models.Requirement, error) {
	return s.repo.GetRequirements(ctx)
}

// CreateIntegrationProvider registers a new integration provider
func (s *Service) CreateIntegrationProvider(ctx context.Context, p *models.IntegrationProvider) error {
	return s.repo.CreateIntegrationProvider(ctx, p)
}
