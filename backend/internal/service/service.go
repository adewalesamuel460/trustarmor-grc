package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/repository"
	"github.com/golang-jwt/jwt/v5"
	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	repo      *repository.Repository
	auditSvc  *AuditService
	jwtSecret []byte
}

type AuthResult struct {
	User         models.User `json:"user"`
	AccessToken  string      `json:"access_token"`
	RefreshToken string      `json:"refresh_token"`
	RequiresMFA  bool        `json:"requires_mfa"`
}

type Claims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

func New(repo *repository.Repository, auditSvc *AuditService, jwtSecret string) *Service {
	return &Service{
		repo:      repo,
		auditSvc:  auditSvc,
		jwtSecret: []byte(jwtSecret),
	}
}

// Register registers a new organization, workspace, user, and sets them as Admin
func (s *Service) Register(ctx context.Context, email, password, orgName, wsName string) (*AuthResult, error) {
	// Hash password
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// 1. Create Organization
	org, err := s.repo.CreateOrganization(ctx, orgName)
	if err != nil {
		return nil, err
	}

	// 2. Create Workspace
	ws, err := s.repo.CreateWorkspace(ctx, org.ID, wsName)
	if err != nil {
		return nil, err
	}

	// 3. Create User
	user, err := s.repo.CreateUser(ctx, email, string(hashedBytes))
	if err != nil {
		return nil, err
	}

	// 4. Retrieve Admin Role ID
	adminRole, err := s.repo.GetRoleByName(ctx, "Admin")
	if err != nil {
		return nil, err
	}

	// 5. Add User as Admin of the workspace
	err = s.repo.AddWorkspaceMember(ctx, ws.ID, user.ID, adminRole.ID)
	if err != nil {
		return nil, err
	}

	// Capture Audit Logs (asynchronously)
	s.auditSvc.LogEvent(
		ws.ID,
		&user.ID,
		&user.Email,
		"workspace.created",
		"workspace",
		ws.ID,
		nil,
		map[string]interface{}{"id": ws.ID, "organization_id": org.ID, "name": wsName},
		"",
	)

	s.auditSvc.LogEvent(
		ws.ID,
		&user.ID,
		&user.Email,
		"workspace_member.created",
		"workspace_member",
		user.ID,
		nil,
		map[string]interface{}{"workspace_id": ws.ID, "user_id": user.ID, "role_name": "Admin"},
		"",
	)

	// Generate tokens
	accessToken, refreshToken, err := s.generateTokenPair(user.ID)
	if err != nil {
		return nil, err
	}

	return &AuthResult{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		RequiresMFA:  false,
	}, nil
}

// Login validates user credentials and returns tokens or MFA requirement
func (s *Service) Login(ctx context.Context, email, password string) (*AuthResult, error) {
	user, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	if user.MFAEnabled {
		return &AuthResult{
			User:        user,
			RequiresMFA: true,
		}, nil
	}

	accessToken, refreshToken, err := s.generateTokenPair(user.ID)
	if err != nil {
		return nil, err
	}

	return &AuthResult{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		RequiresMFA:  false,
	}, nil
}

// VerifyMFA checks the TOTP MFA code and returns tokens on success
func (s *Service) VerifyMFA(ctx context.Context, email, code string) (*AuthResult, error) {
	user, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	if !user.MFAEnabled || user.MFASecret == "" {
		return nil, errors.New("MFA is not enabled for this user")
	}

	valid := totp.Validate(code, user.MFASecret)
	if !valid {
		return nil, errors.New("invalid verification code")
	}

	accessToken, refreshToken, err := s.generateTokenPair(user.ID)
	if err != nil {
		return nil, err
	}

	return &AuthResult{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		RequiresMFA:  false,
	}, nil
}

// SetupMFA generates TOTP secret and key uri for user configuration
func (s *Service) SetupMFA(ctx context.Context, userID string) (string, string, error) {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return "", "", err
	}

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "TrustArmor GRC",
		AccountName: user.Email,
	})
	if err != nil {
		return "", "", fmt.Errorf("failed to generate TOTP key: %w", err)
	}

	// Temporarily save secret (unverified)
	err = s.repo.UpdateUserMFA(ctx, userID, key.Secret(), false)
	if err != nil {
		return "", "", err
	}

	return key.Secret(), key.URL(), nil
}

// ConfirmMFA verifies code and fully enables MFA for user
func (s *Service) ConfirmMFA(ctx context.Context, userID string, code string) error {
	mfaSecret, err := s.repo.GetUserMFASecret(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to retrieve MFA secret: %w", err)
	}

	if mfaSecret == "" {
		return errors.New("MFA secret not initialized. Run setup first")
	}

	valid := totp.Validate(code, mfaSecret)
	if !valid {
		return errors.New("invalid verification code")
	}

	// Formally enable MFA
	err = s.repo.UpdateUserMFA(ctx, userID, mfaSecret, true)
	if err != nil {
		return err
	}

	return nil
}

func (s *Service) RefreshToken(refreshToken string) (string, string, error) {
	token, err := jwt.ParseWithClaims(refreshToken, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return s.jwtSecret, nil
	})

	if err != nil || !token.Valid {
		return "", "", errors.New("invalid or expired refresh token")
	}

	claims, ok := token.Claims.(*Claims)
	if !ok {
		return "", "", errors.New("invalid claims schema")
	}

	return s.generateTokenPair(claims.UserID)
}

func (s *Service) ValidateToken(tokenStr string) (string, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return s.jwtSecret, nil
	})

	if err != nil || !token.Valid {
		return "", errors.New("invalid access token")
	}

	claims, ok := token.Claims.(*Claims)
	if !ok {
		return "", errors.New("invalid claims schema")
	}

	return claims.UserID, nil
}

func (s *Service) CreateWorkspace(ctx context.Context, userID, name string) (models.Workspace, error) {
	// Find user's current workspaces to find organization_id
	userWorkspaces, err := s.repo.GetUserWorkspaces(ctx, userID)
	if err != nil {
		return models.Workspace{}, err
	}

	var orgID string
	if len(userWorkspaces) > 0 {
		orgID = userWorkspaces[0].OrganizationID
	} else {
		// Fallback: create a new organization
		org, err := s.repo.CreateOrganization(ctx, name+" Organization")
		if err != nil {
			return models.Workspace{}, err
		}
		orgID = org.ID
	}

	ws, err := s.repo.CreateWorkspace(ctx, orgID, name)
	if err != nil {
		return models.Workspace{}, err
	}

	adminRole, err := s.repo.GetRoleByName(ctx, "Admin")
	if err != nil {
		return models.Workspace{}, err
	}

	err = s.repo.AddWorkspaceMember(ctx, ws.ID, userID, adminRole.ID)
	if err != nil {
		return models.Workspace{}, err
	}

	// Capture Audit Logs (asynchronously)
	actor, err := s.repo.GetUserByID(ctx, userID)
	if err == nil {
		s.auditSvc.LogEvent(
			ws.ID,
			&userID,
			&actor.Email,
			"workspace.created",
			"workspace",
			ws.ID,
			nil,
			ws,
			"",
		)

		s.auditSvc.LogEvent(
			ws.ID,
			&userID,
			&actor.Email,
			"workspace_member.created",
			"workspace_member",
			userID,
			nil,
			map[string]interface{}{"workspace_id": ws.ID, "user_id": userID, "role_name": "Admin"},
			"",
		)
	}

	return ws, nil
}

func (s *Service) GetWorkspaceMembers(ctx context.Context, workspaceID string) ([]models.WorkspaceMember, error) {
	return s.repo.GetWorkspaceMembers(ctx, workspaceID)
}

func (s *Service) InviteUser(ctx context.Context, actorID string, workspaceID, email, roleName string) error {
	// Find or create user
	var targetUserID string
	targetUser, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		// User does not exist, let's auto-create with a temporary password
		hashedBytes, _ := bcrypt.GenerateFromPassword([]byte("Temporary123!"), bcrypt.DefaultCost)
		user, err := s.repo.CreateUser(ctx, email, string(hashedBytes))
		if err != nil {
			return fmt.Errorf("failed to create invited user profile: %w", err)
		}
		targetUserID = user.ID
	} else {
		targetUserID = targetUser.ID
	}

	role, err := s.repo.GetRoleByName(ctx, roleName)
	if err != nil {
		return fmt.Errorf("invalid role selection: %w", err)
	}

	err = s.repo.AddWorkspaceMember(ctx, workspaceID, targetUserID, role.ID)
	if err != nil {
		return err
	}

	// Capture Audit Logs (asynchronously)
	actor, err := s.repo.GetUserByID(ctx, actorID)
	if err == nil {
		s.auditSvc.LogEvent(
			workspaceID,
			&actorID,
			&actor.Email,
			"workspace_member.created",
			"workspace_member",
			targetUserID,
			nil,
			map[string]interface{}{"workspace_id": workspaceID, "user_id": targetUserID, "role_name": roleName},
			"",
		)
	}

	return nil
}

// Helper to generate access + refresh token
func (s *Service) generateTokenPair(userID string) (string, string, error) {
	// Access Token (15 mins)
	accessClaims := &Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessStr, err := accessToken.SignedString(s.jwtSecret)
	if err != nil {
		return "", "", fmt.Errorf("failed to sign access token: %w", err)
	}

	// Refresh Token (7 days)
	refreshClaims := &Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshStr, err := refreshToken.SignedString(s.jwtSecret)
	if err != nil {
		return "", "", fmt.Errorf("failed to sign refresh token: %w", err)
	}

	return accessStr, refreshStr, nil
}
