package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net/smtp"
	"os"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// RequestPasswordReset generates a reset token and either emails it (if SMTP is configured)
// or logs it to the console (development mode).
// Returns a generic success message regardless of whether the email exists
// to prevent user enumeration attacks.
func (s *Service) RequestPasswordReset(ctx context.Context, email string) (devToken string, err error) {
	// Look up user by email — silently succeed if not found (anti-enumeration)
	user, lookupErr := s.repo.GetUserByEmail(ctx, email)
	if lookupErr != nil {
		log.Printf("INFO [PasswordReset]: No account found for email %s (no action taken)", email)
		return "", nil // Always return 200 — prevents enumeration
	}

	// Generate a cryptographically secure 64-char hex token
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", fmt.Errorf("failed to generate secure token: %w", err)
	}
	token := hex.EncodeToString(tokenBytes)

	// Token expires in 1 hour
	expiresAt := time.Now().Add(1 * time.Hour)
	if err := s.repo.CreatePasswordResetToken(ctx, user.ID, token, expiresAt); err != nil {
		return "", err
	}

	// Build reset URL
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}
	resetURL := fmt.Sprintf("%s/reset-password?token=%s", frontendURL, token)

	smtpHost := os.Getenv("SMTP_HOST")
	if smtpHost != "" {
		// Production: send email via SMTP
		if err := sendResetEmail(email, resetURL); err != nil {
			log.Printf("WARNING [PasswordReset]: Failed to send email to %s: %v", email, err)
			// Still return token in dev-like fallback
			return token, nil
		}
		log.Printf("INFO [PasswordReset]: Reset email sent to %s", email)
		return "", nil // Don't expose token when email sent successfully
	}

	// Development fallback: log the link to the server console
	log.Printf("\n========================================")
	log.Printf("  PASSWORD RESET LINK (DEV MODE)")
	log.Printf("  Email : %s", email)
	log.Printf("  URL   : %s", resetURL)
	log.Printf("  Expiry: %s", expiresAt.Format(time.RFC3339))
	log.Printf("========================================\n")

	// In dev mode only, return the raw token so the frontend can show the reset link directly
	return token, nil
}

// ResetPassword validates the token and sets the new password
func (s *Service) ResetPassword(ctx context.Context, token string, newPassword string) error {
	if len(newPassword) < 8 {
		return fmt.Errorf("password must be at least 8 characters")
	}

	userID, err := s.repo.GetPasswordResetToken(ctx, token)
	if err != nil {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	if err := s.repo.UpdateUserPassword(ctx, userID, string(hash)); err != nil {
		return err
	}

	return s.repo.MarkPasswordResetTokenUsed(ctx, token)
}

// sendResetEmail sends a password reset email via SMTP.
// Required env vars: SMTP_HOST, SMTP_PORT (optional, def 587), SMTP_USER, SMTP_PASSWORD, SMTP_FROM
func sendResetEmail(toEmail, resetURL string) error {
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASSWORD")
	fromAddr := os.Getenv("SMTP_FROM")

	if smtpPort == "" {
		smtpPort = "587"
	}
	if fromAddr == "" {
		fromAddr = "noreply@trustarmor.io"
	}

	subject := "Reset Your TrustArmor Password"
	body := strings.Join([]string{
		"Hello,",
		"",
		"You requested to reset your TrustArmor GRC account password.",
		"Click the link below to set a new password. This link expires in 1 hour.",
		"",
		resetURL,
		"",
		"If you did not request this, you can safely ignore this email.",
		"",
		"— TrustArmor Security Team",
	}, "\r\n")

	message := fmt.Sprintf("From: TrustArmor <%s>\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		fromAddr, toEmail, subject, body)

	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)
	return smtp.SendMail(smtpHost+":"+smtpPort, auth, fromAddr, []string{toEmail}, []byte(message))
}
