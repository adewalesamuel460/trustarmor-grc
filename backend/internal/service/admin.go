package service

import (
	"context"
	"fmt"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
)

// AdminListTenants returns a list of tenants to authorized admins
func (s *Service) AdminListTenants(ctx context.Context, adminUserID string) ([]map[string]any, error) {
	isAdmin, err := s.repo.IsGlobalAdmin(ctx, adminUserID)
	if err != nil || !isAdmin {
		return nil, fmt.Errorf("unauthorized support privilege required")
	}

	return s.repo.ListTenants(ctx)
}

// AdminUpdateTenantStatus suspends or reactivates a tenant organization
func (s *Service) AdminUpdateTenantStatus(ctx context.Context, adminUserID string, orgID string, status string, ipAddress string) error {
	isAdmin, err := s.repo.IsGlobalAdmin(ctx, adminUserID)
	if err != nil || !isAdmin {
		return fmt.Errorf("unauthorized support privilege required")
	}

	admin, err := s.repo.GetGlobalAdminByUserID(ctx, adminUserID)
	if err != nil {
		return err
	}

	err = s.repo.UpdateTenantStatus(ctx, orgID, status)
	if err != nil {
		return err
	}

	// Audit log suspension/reactivation
	action := "tenant_status_updated"
	if status == "suspended" {
		action = "tenant_suspended"
	} else if status == "active" {
		action = "tenant_activated"
	}

	log := models.GlobalAuditLog{
		GlobalAdminID:        admin.ID,
		TargetOrganizationID: &orgID,
		Action:               action,
		Details:              map[string]string{"new_status": status},
		IPAddress:            ipAddress,
	}

	return s.repo.CreateGlobalAuditLog(ctx, &log)
}

// AdminImpersonateUser generates an impersonation token pair for support sessions
func (s *Service) AdminImpersonateUser(ctx context.Context, adminUserID string, targetUserID string, ipAddress string) (string, string, error) {
	isAdmin, err := s.repo.IsGlobalAdmin(ctx, adminUserID)
	if err != nil || !isAdmin {
		return "", "", fmt.Errorf("unauthorized support privilege required")
	}

	admin, err := s.repo.GetGlobalAdminByUserID(ctx, adminUserID)
	if err != nil {
		return "", "", err
	}

	// Verify target user exists
	targetUser, err := s.repo.GetUserByID(ctx, targetUserID)
	if err != nil {
		return "", "", fmt.Errorf("target user not found: %w", err)
	}

	// Fetch target user organization/workspace context to log
	userWorkspaces, err := s.repo.GetUserWorkspaces(ctx, targetUserID)
	var targetOrgID *string
	var targetWSID *string
	if err == nil && len(userWorkspaces) > 0 {
		targetOrgID = &userWorkspaces[0].OrganizationID
		targetWSID = &userWorkspaces[0].ID
	}

	// Generate JWT tokens carrying the is_impersonating claim
	access, refresh, err := s.generateImpersonatedTokenPair(targetUserID)
	if err != nil {
		return "", "", err
	}

	// Record impersonation event in audit logs
	log := models.GlobalAuditLog{
		GlobalAdminID:        admin.ID,
		TargetOrganizationID: targetOrgID,
		TargetWorkspaceID:    targetWSID,
		Action:               "impersonation_started",
		Details:              map[string]string{"target_user_email": targetUser.Email},
		IPAddress:            ipAddress,
	}
	_ = s.repo.CreateGlobalAuditLog(ctx, &log)

	return access, refresh, nil
}

// AdminPushGlobalFramework pushes a compliance framework and its clauses to the global library
func (s *Service) AdminPushGlobalFramework(ctx context.Context, adminUserID string, f *models.Framework, reqs []models.Requirement, ipAddress string) error {
	isAdmin, err := s.repo.IsGlobalAdmin(ctx, adminUserID)
	if err != nil || !isAdmin {
		return fmt.Errorf("unauthorized support privilege required")
	}

	admin, err := s.repo.GetGlobalAdminByUserID(ctx, adminUserID)
	if err != nil {
		return err
	}

	// Save global framework definition
	err = s.repo.CreateGlobalFramework(ctx, f)
	if err != nil {
		return err
	}

	// Save associated clauses
	for i := range reqs {
		reqs[i].FrameworkID = f.ID
		err = s.repo.CreateGlobalRequirement(ctx, &reqs[i])
		if err != nil {
			return err
		}
	}

	// Log support content distribution
	log := models.GlobalAuditLog{
		GlobalAdminID: admin.ID,
		Action:         "framework_pushed",
		Details:        map[string]string{"framework_name": f.Name, "version": f.Version},
		IPAddress:      ipAddress,
	}
	return s.repo.CreateGlobalAuditLog(ctx, &log)
}

// AdminGetAuditLogs retrieves platform audit log trail for employee actions
func (s *Service) AdminGetAuditLogs(ctx context.Context, adminUserID string) ([]models.GlobalAuditLog, error) {
	isAdmin, err := s.repo.IsGlobalAdmin(ctx, adminUserID)
	if err != nil || !isAdmin {
		return nil, fmt.Errorf("unauthorized support privilege required")
	}

	return s.repo.GetGlobalAuditLogs(ctx)
}

// AdminGetTenantUsers lists users in a tenant organization
func (s *Service) AdminGetTenantUsers(ctx context.Context, adminUserID string, orgID string) ([]models.User, error) {
	isAdmin, err := s.repo.IsGlobalAdmin(ctx, adminUserID)
	if err != nil || !isAdmin {
		return nil, fmt.Errorf("unauthorized support privilege required")
	}

	return s.repo.GetTenantUsers(ctx, orgID)
}

// AdminGetTenantFrameworks lists activated frameworks for a tenant organization
func (s *Service) AdminGetTenantFrameworks(ctx context.Context, adminUserID string, orgID string) ([]models.Framework, error) {
	isAdmin, err := s.repo.IsGlobalAdmin(ctx, adminUserID)
	if err != nil || !isAdmin {
		return nil, fmt.Errorf("unauthorized support privilege required")
	}

	return s.repo.GetTenantFrameworks(ctx, orgID)
}

// AdminPromoteUser grants global admin privileges to a user identified by email
func (s *Service) AdminPromoteUser(ctx context.Context, adminUserID string, targetEmail string, role string, ipAddress string) error {
	isAdmin, err := s.repo.IsGlobalAdmin(ctx, adminUserID)
	if err != nil || !isAdmin {
		return fmt.Errorf("unauthorized: super_admin privilege required")
	}

	targetUser, err := s.repo.GetUserByEmail(ctx, targetEmail)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	if err := s.repo.PromoteUserToAdmin(ctx, targetUser.ID, role); err != nil {
		return err
	}

	admin, _ := s.repo.GetGlobalAdminByUserID(ctx, adminUserID)
	if admin != nil {
		log := models.GlobalAuditLog{
			GlobalAdminID: admin.ID,
			Action:        "admin_promoted",
			Details:       map[string]string{"target_email": targetEmail, "role": role},
			IPAddress:     ipAddress,
		}
		_ = s.repo.CreateGlobalAuditLog(ctx, &log)
	}

	return nil
}

// AdminDemoteUser removes global admin privileges from a user identified by email
func (s *Service) AdminDemoteUser(ctx context.Context, adminUserID string, targetEmail string, ipAddress string) error {
	isAdmin, err := s.repo.IsGlobalAdmin(ctx, adminUserID)
	if err != nil || !isAdmin {
		return fmt.Errorf("unauthorized: super_admin privilege required")
	}

	targetUser, err := s.repo.GetUserByEmail(ctx, targetEmail)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	if err := s.repo.DemoteUserFromAdmin(ctx, targetUser.ID); err != nil {
		return err
	}

	admin, _ := s.repo.GetGlobalAdminByUserID(ctx, adminUserID)
	if admin != nil {
		log := models.GlobalAuditLog{
			GlobalAdminID: admin.ID,
			Action:        "admin_demoted",
			Details:       map[string]string{"target_email": targetEmail},
			IPAddress:     ipAddress,
		}
		_ = s.repo.CreateGlobalAuditLog(ctx, &log)
	}

	return nil
}

// AdminListGlobalAdmins returns the list of all platform administrators
func (s *Service) AdminListGlobalAdmins(ctx context.Context, adminUserID string) ([]map[string]any, error) {
	isAdmin, err := s.repo.IsGlobalAdmin(ctx, adminUserID)
	if err != nil || !isAdmin {
		return nil, fmt.Errorf("unauthorized: support privilege required")
	}
	return s.repo.ListGlobalAdmins(ctx)
}
