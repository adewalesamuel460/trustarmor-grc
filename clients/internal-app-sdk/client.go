package sdk

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"time"
)

// Config defines connection and authentication settings for the TrustArmor reporting client
type Config struct {
	TrustArmorURL string        `json:"trustarmor_url"` // e.g. "http://localhost:8000"
	WorkspaceID   string        `json:"workspace_id"`
	ConnectionID  string        `json:"connection_id"`
	ProductID     string        `json:"product_id"`
	APIKey        string        `json:"api_key"`
	Timeout       time.Duration `json:"timeout"`
	MaxRetries    int           `json:"max_retries"`
}

// Asset represents a single self-reported compliance asset item
type Asset struct {
	AssetType      string                 `json:"asset_type"`      // 'custom_user', 'custom_cloud_database', 'custom_cloud_server'
	ExternalID     string                 `json:"external_id"`     // Unique ID within the reporting application
	Name           string                 `json:"name"`            // Human-readable asset label
	RawData        map[string]interface{} `json:"raw_data"`        // Telemetry payload (mfa_enabled, encrypted_at_rest, backup_last_run)
	ComplianceRisk bool                   `json:"compliance_risk"` // Optional boolean risk flag
}

// IngestionPayload is the POST request body sent to TrustArmor GRC
type IngestionPayload struct {
	ProductID string  `json:"product_id,omitempty"`
	Assets    []Asset `json:"assets"`
}

// IngestionResponse represents the API response from TrustArmor
type IngestionResponse struct {
	Message         string `json:"message"`
	ConnectionID    string `json:"connection_id"`
	RecordsIngested int    `json:"records_ingested"`
	SyncedAt        string `json:"synced_at"`
}

// Client is the lightweight reporting SDK client instance
type Client struct {
	config     Config
	httpClient *http.Client
}

// NewClient initializes a new TrustArmor reporting SDK client
func NewClient(cfg Config) (*Client, error) {
	if cfg.TrustArmorURL == "" {
		return nil, fmt.Errorf("trustarmor_url is required")
	}
	if cfg.WorkspaceID == "" || cfg.ConnectionID == "" || cfg.APIKey == "" {
		return nil, fmt.Errorf("workspace_id, connection_id, and api_key are required")
	}
	if cfg.Timeout == 0 {
		cfg.Timeout = 10 * time.Second
	}
	if cfg.MaxRetries == 0 {
		cfg.MaxRetries = 3
	}

	return &Client{
		config: cfg,
		httpClient: &http.Client{
			Timeout: cfg.Timeout,
		},
	}, nil
}

// ReportAssets posts the gathered compliance assets to TrustArmor GRC with exponential backoff retries
func (c *Client) ReportAssets(ctx context.Context, assets []Asset) (*IngestionResponse, error) {
	if len(assets) == 0 {
		log.Println("[TrustArmorSDK] Notice: zero assets provided for reporting.")
		return &IngestionResponse{Message: "Zero assets provided"}, nil
	}

	payload := IngestionPayload{
		ProductID: c.config.ProductID,
		Assets:    assets,
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("[TrustArmorSDK] Failed to marshal assets payload: %w", err)
	}

	endpoint := fmt.Sprintf("%s/workspaces/%s/integrations/%s/assets",
		c.config.TrustArmorURL, c.config.WorkspaceID, c.config.ConnectionID)

	var lastErr error
	var resp *http.Response

	for attempt := 0; attempt <= c.config.MaxRetries; attempt++ {
		if attempt > 0 {
			backoff := time.Duration(math.Pow(2, float64(attempt-1))) * 500 * time.Millisecond
			log.Printf("[TrustArmorSDK] Retry attempt %d/%d after %v backoff...", attempt, c.config.MaxRetries, backoff)
			time.Sleep(backoff)
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewBuffer(bodyBytes))
		if err != nil {
			return nil, fmt.Errorf("[TrustArmorSDK] Failed to create HTTP request: %w", err)
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+c.config.APIKey)

		resp, lastErr = c.httpClient.Do(req)
		if lastErr == nil && resp.StatusCode < 500 {
			break // Success or client 4xx error (do not retry 4xx errors)
		}
	}

	if lastErr != nil {
		log.Printf("[TrustArmorSDK] ERROR: Failed to transmit compliance state after %d retries: %v", c.config.MaxRetries, lastErr)
		return nil, lastErr
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode >= 400 {
		errMsg := fmt.Sprintf("[TrustArmorSDK] Ingestion rejected (HTTP %d): %s", resp.StatusCode, string(respBody))
		log.Printf("ERROR: %s", errMsg)
		return nil, fmt.Errorf(errMsg)
	}

	var res IngestionResponse
	if err := json.Unmarshal(respBody, &res); err != nil {
		return nil, fmt.Errorf("[TrustArmorSDK] Failed to parse response: %w", err)
	}

	log.Printf("[TrustArmorSDK] Success: Reported %d compliance asset(s) to TrustArmor GRC (Synced: %s)",
		res.RecordsIngested, res.SyncedAt)

	return &res, nil
}
