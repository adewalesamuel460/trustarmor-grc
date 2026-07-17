package service

import (
	"context"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

// GetProfile returns account information for the authenticated user
func (s *Service) GetProfile(ctx context.Context, userID string) (map[string]any, error) {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user: %w", err)
	}

	workspaces, _ := s.repo.GetUserWorkspaces(ctx, userID)

	// Check if user has global admin status
	adminInfo, _ := s.repo.GetGlobalAdminByUserID(ctx, userID)

	profile := map[string]any{
		"id":          user.ID,
		"email":       user.Email,
		"mfa_enabled": user.MFAEnabled,
		"created_at":  user.CreatedAt,
		"workspaces":  workspaces,
		"is_admin":    adminInfo != nil,
		"admin_role":  nil,
	}
	if adminInfo != nil {
		profile["admin_role"] = adminInfo.Role
	}

	return profile, nil
}

// ChangePassword verifies the current password and updates to the new one
func (s *Service) ChangePassword(ctx context.Context, userID string, currentPassword string, newPassword string) error {
	if len(newPassword) < 8 {
		return fmt.Errorf("new password must be at least 8 characters")
	}

	existingHash, err := s.repo.GetUserPasswordHash(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to retrieve credentials: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(existingHash), []byte(currentPassword)); err != nil {
		return fmt.Errorf("current password is incorrect")
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash new password: %w", err)
	}

	return s.repo.UpdateUserPassword(ctx, userID, string(newHash))
}
