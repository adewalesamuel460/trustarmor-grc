package collectors

import (
	"context"
	"encoding/json"
	"time"
)

// CustomCloudCollector demonstrates how custom/proprietary internal cloud infrastructure or SaaS APIs plug into TrustArmor GRC
type CustomCloudCollector struct{}

func (c *CustomCloudCollector) ProviderName() string {
	return "Custom Cloud"
}

func (c *CustomCloudCollector) FetchAssets(ctx context.Context, encryptedCreds []byte, plaintextCreds []byte) ([]CollectorResult, error) {
	// Parse credentials if present (API Key, Base URL, or OAuth token)
	var creds map[string]interface{}
	if len(plaintextCreds) > 0 {
		_ = json.Unmarshal(plaintextCreds, &creds)
	}

	// Example: In a real custom deployment, make HTTP requests to your custom cloud API endpoints:
	// resp, err := http.Get(creds["api_url"]) ...

	results := []CollectorResult{
		{
			AssetType:  "custom_cloud_server",
			ExternalID: "srv-custom-001",
			Name:       "Internal Auth Microservice Cluster",
			RawData: map[string]interface{}{
				"environment":         "production",
				"disk_encrypted":      true,
				"tls_version":         "TLSv1.3",
				"open_ports":          []int{443},
				"publicly_accessible": false,
			},
			ComplianceRisk: false,
		},
		{
			AssetType:  "custom_cloud_database",
			ExternalID: "db-custom-99",
			Name:       "Primary Customer Data Store",
			RawData: map[string]interface{}{
				"encrypted_at_rest": true,
				"backup_retention":  30,
				"multi_az":          true,
			},
			ComplianceRisk: false,
		},
		{
			AssetType:  "custom_user",
			ExternalID: "usr-admin-01",
			Name:       "DevOps Deployment Service Account",
			RawData: map[string]interface{}{
				"mfa_enabled":     true,
				"last_login":       time.Now().Add(-2 * time.Hour).Format(time.RFC3339),
				"role_permissions": []string{"deploy", "read"},
			},
			ComplianceRisk: false,
		},
	}

	return results, nil
}

// AWSMockCollector provides a built-in AWS integration collector implementation
type AWSMockCollector struct{}

func (c *AWSMockCollector) ProviderName() string {
	return "AWS"
}

func (c *AWSMockCollector) FetchAssets(ctx context.Context, encryptedCreds []byte, plaintextCreds []byte) ([]CollectorResult, error) {
	return []CollectorResult{
		{
			AssetType:  "cloud_user",
			ExternalID: "arn:aws:iam::123456789012:user/john.doe",
			Name:       "john.doe@company.com",
			RawData: map[string]interface{}{
				"mfa_active":        false, // Will trigger MFA rule failure
				"access_key_age":    120,
				"inline_policies":   []string{"AdministratorAccess"},
			},
			ComplianceRisk: true, // Risk flagged
		},
		{
			AssetType:  "cloud_storage",
			ExternalID: "arn:aws:s3:::company-audit-logs-2026",
			Name:       "company-audit-logs-2026",
			RawData: map[string]interface{}{
				"public_access_block": true,
				"encryption_type":     "AES256",
				"versioning":          "Enabled",
			},
			ComplianceRisk: false,
		},
	}, nil
}

// GitHubMockCollector provides a built-in GitHub integration collector implementation
type GitHubMockCollector struct{}

func (c *GitHubMockCollector) ProviderName() string {
	return "GitHub"
}

func (c *GitHubMockCollector) FetchAssets(ctx context.Context, encryptedCreds []byte, plaintextCreds []byte) ([]CollectorResult, error) {
	return []CollectorResult{
		{
			AssetType:  "repository",
			ExternalID: "github.com/company/trustarmor-grc",
			Name:       "trustarmor-grc",
			RawData: map[string]interface{}{
				"default_branch":             "main",
				"requires_approving_reviews": true,
				"approving_review_count":     1,
				"secret_scanning":            true,
			},
			ComplianceRisk: false,
		},
	}, nil
}
