package sdk

import (
	"time"
)

// SampleStateCollector demonstrates how an internal software application gathers its own local compliance telemetry
type SampleStateCollector struct {
	AppName string
}

// GatherComplianceState collects user MFA status, database encryption status, and backup last run time
func (c *SampleStateCollector) GatherComplianceState() []Asset {
	now := time.Now().UTC()

	return []Asset{
		{
			AssetType:  "custom_user",
			ExternalID: "usr-" + c.AppName + "-admin-01",
			Name:       c.AppName + " Admin Account",
			RawData: map[string]interface{}{
				"mfa_enabled": true,
				"mfa_active":  true,
				"last_login":  now.Add(-1 * time.Hour).Format(time.RFC3339),
				"role":        "admin",
			},
			ComplianceRisk: false,
		},
		{
			AssetType:  "custom_cloud_database",
			ExternalID: "db-" + c.AppName + "-main",
			Name:       c.AppName + " Primary Database",
			RawData: map[string]interface{}{
				"encrypted_at_rest": true,
				"encryption_type":   "AES256",
				"backup_last_run":   now.Add(-2 * time.Hour).Format(time.RFC3339),
				"multi_az":         true,
			},
			ComplianceRisk: false,
		},
		{
			AssetType:  "custom_cloud_server",
			ExternalID: "srv-" + c.AppName + "-web-01",
			Name:       c.AppName + " Application Web Cluster",
			RawData: map[string]interface{}{
				"tls_version":         "TLSv1.3",
				"disk_encrypted":      true,
				"publicly_accessible": false,
			},
			ComplianceRisk: false,
		},
	}
}
