package collectors

import (
	"context"
	"sync"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
)

// CollectorResult represents a normalized asset fetched from an external API or custom cloud infrastructure
type CollectorResult struct {
	AssetType      string                 `json:"asset_type"`  // e.g., 'cloud_user', 'cloud_storage', 'repository', 'custom_service'
	ExternalID     string                 `json:"external_id"` // Unique identifier from source
	Name           string                 `json:"name"`        // Human-readable asset name
	RawData        map[string]interface{} `json:"raw_data"`    // Full JSON payload metadata
	ComplianceRisk bool                   `json:"compliance_risk"`
}

// Collector defines the interface that any cloud, SaaS, or custom internal infrastructure collector must implement
type Collector interface {
	// ProviderName returns the identifier matching IntegrationProvider.Name (e.g. "AWS", "GitHub", "CustomCloud", "MyInternalService")
	ProviderName() string
	// FetchAssets executes the API calls using decrypted connection credentials and returns normalized assets
	FetchAssets(ctx context.Context, encryptedCreds []byte, plaintextCreds []byte) ([]CollectorResult, error)
}

// Registry manages registered integration collectors dynamically
type Registry struct {
	mu         sync.RWMutex
	collectors map[string]Collector
}

// NewRegistry initializes a new collector registry
func NewRegistry() *Registry {
	r := &Registry{
		collectors: make(map[string]Collector),
	}
	// Register default/custom collectors
	r.Register(&CustomCloudCollector{})
	r.Register(&AWSMockCollector{})
	r.Register(&GitHubMockCollector{})
	return r
}

// Register registers a new collector. This allows custom internal APIs or cloud connectors to be plugged in seamlessly.
func (r *Registry) Register(c Collector) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.collectors[c.ProviderName()] = c
}

// Get retrieves a collector by provider name
func (r *Registry) Get(providerName string) (Collector, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	c, ok := r.collectors[providerName]
	return c, ok
}

// Helper to convert CollectorResult to models.Asset
func ToModelAsset(workspaceID, integrationID string, res CollectorResult) models.Asset {
	return models.Asset{
		WorkspaceID:    workspaceID,
		IntegrationID:  integrationID,
		AssetType:      res.AssetType,
		ExternalID:     res.ExternalID,
		Name:           res.Name,
		RawData:        res.RawData,
		ComplianceRisk: res.ComplianceRisk,
	}
}
