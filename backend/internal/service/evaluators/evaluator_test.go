package evaluators

import (
	"context"
	"testing"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMFAEvaluator_MatchControl(t *testing.T) {
	eval := &MFAEvaluator{}

	tests := []struct {
		title    string
		expected bool
	}{
		{"Enforce Multi-Factor Authentication for IAM Users", true},
		{"MFA Requirement on Production Portal", true},
		{"Require 2FA for all Administrators", true},
		{"Database Encryption at Rest", false},
		{"Password Complexity Policy", false},
	}

	for _, tt := range tests {
		t.Run(tt.title, func(t *testing.T) {
			ctrl := &models.Control{Title: tt.title}
			assert.Equal(t, tt.expected, eval.MatchControl(ctrl))
		})
	}
}

func TestMFAEvaluator_Evaluate(t *testing.T) {
	ctx := context.Background()
	eval := &MFAEvaluator{}
	ctrl := &models.Control{Title: "Enforce MFA"}

	t.Run("Pass - All users have MFA enabled", func(t *testing.T) {
		assets := []models.Asset{
			{
				AssetType: "cloud_user",
				Name:      "user1@company.com",
				RawData:   map[string]interface{}{"mfa_active": true},
			},
			{
				AssetType: "custom_user",
				Name:      "devops-sa",
				RawData:   map[string]interface{}{"mfa_enabled": true},
			},
		}

		res, err := eval.Evaluate(ctx, ctrl, assets)
		require.NoError(t, err)
		assert.Equal(t, "passing", res.Status)
		assert.Contains(t, res.Reason, "passed")
		assert.Equal(t, "passed", res.Payload["status"])
	})

	t.Run("Fail - Non-compliant users detected", func(t *testing.T) {
		assets := []models.Asset{
			{
				AssetType: "cloud_user",
				Name:      "compliant@company.com",
				RawData:   map[string]interface{}{"mfa_active": true},
			},
			{
				AssetType: "cloud_user",
				Name:      "noncompliant@company.com",
				RawData:   map[string]interface{}{"mfa_active": false, "mfa_enabled": false},
			},
		}

		res, err := eval.Evaluate(ctx, ctrl, assets)
		require.NoError(t, err)
		assert.Equal(t, "failing", res.Status)
		assert.Contains(t, res.Reason, "MFA enforcement check failed")
		assert.Equal(t, "failed", res.Payload["status"])

		nonCompliant, ok := res.Payload["non_compliant_users"].([]string)
		require.True(t, ok)
		assert.Contains(t, nonCompliant, "noncompliant@company.com")
		assert.NotContains(t, nonCompliant, "compliant@company.com")
	})

	t.Run("Edge Case - Empty assets list", func(t *testing.T) {
		res, err := eval.Evaluate(ctx, ctrl, []models.Asset{})
		require.NoError(t, err)
		assert.Equal(t, "passing", res.Status)
	})

	t.Run("Edge Case - Irrelevant asset types and missing raw_data keys", func(t *testing.T) {
		assets := []models.Asset{
			{
				AssetType: "cloud_storage",
				Name:      "s3-bucket",
				RawData:   map[string]interface{}{"public": false},
			},
			{
				AssetType: "cloud_user",
				Name:      "user-without-mfa-key",
				RawData:   map[string]interface{}{}, // missing keys default to false -> flagged
			},
		}

		res, err := eval.Evaluate(ctx, ctrl, assets)
		require.NoError(t, err)
		assert.Equal(t, "failing", res.Status)

		nonCompliant, ok := res.Payload["non_compliant_users"].([]string)
		require.True(t, ok)
		assert.Equal(t, 1, len(nonCompliant))
		assert.Equal(t, "user-without-mfa-key", nonCompliant[0])
	})
}

func TestEncryptionEvaluator_MatchControl(t *testing.T) {
	eval := &EncryptionEvaluator{}

	tests := []struct {
		title    string
		expected bool
	}{
		{"Storage Encryption at Rest", true},
		{"AWS KMS Key Rotation Policy", true},
		{"Logical Access Control", false},
	}

	for _, tt := range tests {
		t.Run(tt.title, func(t *testing.T) {
			ctrl := &models.Control{Title: tt.title}
			assert.Equal(t, tt.expected, eval.MatchControl(ctrl))
		})
	}
}

func TestEncryptionEvaluator_Evaluate(t *testing.T) {
	ctx := context.Background()
	eval := &EncryptionEvaluator{}
	ctrl := &models.Control{Title: "Data Encryption"}

	t.Run("Pass - All storage and db assets encrypted", func(t *testing.T) {
		assets := []models.Asset{
			{
				AssetType: "cloud_storage",
				Name:      "audit-logs-bucket",
				RawData:   map[string]interface{}{"encryption_type": "AES256"},
			},
			{
				AssetType: "custom_cloud_database",
				Name:      "primary-db",
				RawData:   map[string]interface{}{"encrypted_at_rest": true},
			},
		}

		res, err := eval.Evaluate(ctx, ctrl, assets)
		require.NoError(t, err)
		assert.Equal(t, "passing", res.Status)
		assert.Equal(t, "passed", res.Payload["status"])
	})

	t.Run("Fail - Unencrypted storage assets", func(t *testing.T) {
		assets := []models.Asset{
			{
				AssetType: "cloud_storage",
				Name:      "public-bucket",
				RawData:   map[string]interface{}{"encrypted_at_rest": false},
			},
		}

		res, err := eval.Evaluate(ctx, ctrl, assets)
		require.NoError(t, err)
		assert.Equal(t, "failing", res.Status)
		assert.Equal(t, 1, res.Payload["unencrypted_count"])
	})

	t.Run("Edge Case - Empty assets list", func(t *testing.T) {
		res, err := eval.Evaluate(ctx, ctrl, []models.Asset{})
		require.NoError(t, err)
		assert.Equal(t, "passing", res.Status)
	})
}

func TestRegistry_EvaluateControl(t *testing.T) {
	ctx := context.Background()
	registry := NewRegistry()

	t.Run("Matches MFAEvaluator for MFA control", func(t *testing.T) {
		ctrl := &models.Control{Title: "Enforce MFA for Cloud Access"}
		assets := []models.Asset{
			{
				AssetType: "cloud_user",
				Name:      "alice",
				RawData:   map[string]interface{}{"mfa_active": true},
			},
		}

		res, err := registry.EvaluateControl(ctx, ctrl, assets)
		require.NoError(t, err)
		assert.Equal(t, "passing", res.Status)
		assert.Contains(t, res.Reason, "MFA")
	})

	t.Run("Matches EncryptionEvaluator for KMS control", func(t *testing.T) {
		ctrl := &models.Control{Title: "Data Encryption & KMS"}
		assets := []models.Asset{
			{
				AssetType: "cloud_storage",
				Name:      "bucket1",
				RawData:   map[string]interface{}{"encryption_type": "KMS"},
			},
		}

		res, err := registry.EvaluateControl(ctx, ctrl, assets)
		require.NoError(t, err)
		assert.Equal(t, "passing", res.Status)
		assert.Contains(t, res.Reason, "Encryption")
	})

	t.Run("Falls back to DefaultEvaluator for unmatched control", func(t *testing.T) {
		ctrl := &models.Control{Title: "Annual Security Training Policy"}
		res, err := registry.EvaluateControl(ctx, ctrl, []models.Asset{})
		require.NoError(t, err)
		assert.Equal(t, "passing", res.Status)
		assert.Contains(t, res.Reason, "Automated control baseline verified")
	})
}
