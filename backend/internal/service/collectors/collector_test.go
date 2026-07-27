package collectors

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type MockTestCollector struct{}

func (m *MockTestCollector) ProviderName() string {
	return "MockProvider"
}

func (m *MockTestCollector) FetchAssets(ctx context.Context, encryptedCreds []byte, plaintextCreds []byte) ([]CollectorResult, error) {
	return []CollectorResult{
		{
			AssetType:  "mock_asset",
			ExternalID: "mock-1",
			Name:       "Mock Asset Name",
			RawData:    map[string]interface{}{"status": "ok"},
		},
	}, nil
}

func TestRegistry(t *testing.T) {
	t.Run("NewRegistry initializes default collectors", func(t *testing.T) {
		reg := NewRegistry()
		require.NotNil(t, reg)

		providers := []string{"Custom Cloud", "AWS", "GitHub"}
		for _, provider := range providers {
			c, ok := reg.Get(provider)
			assert.True(t, ok, "Expected provider %s to be registered", provider)
			assert.NotNil(t, c)
			assert.Equal(t, provider, c.ProviderName())
		}
	})

	t.Run("Register dynamically adds new collectors", func(t *testing.T) {
		reg := NewRegistry()
		mock := &MockTestCollector{}

		reg.Register(mock)
		c, ok := reg.Get("MockProvider")
		assert.True(t, ok)
		assert.Equal(t, mock, c)
	})

	t.Run("Get returns false for unregistered providers", func(t *testing.T) {
		reg := NewRegistry()
		c, ok := reg.Get("NonExistentProvider")
		assert.False(t, ok)
		assert.Nil(t, c)
	})
}

func TestToModelAsset(t *testing.T) {
	workspaceID := "ws-123"
	integrationID := "int-456"
	res := CollectorResult{
		AssetType:      "cloud_user",
		ExternalID:     "usr-99",
		Name:           "alice@company.com",
		RawData:        map[string]interface{}{"mfa_active": true},
		ComplianceRisk: false,
	}

	modelAsset := ToModelAsset(workspaceID, integrationID, res)

	assert.Equal(t, workspaceID, modelAsset.WorkspaceID)
	assert.Equal(t, integrationID, modelAsset.IntegrationID)
	assert.Equal(t, res.AssetType, modelAsset.AssetType)
	assert.Equal(t, res.ExternalID, modelAsset.ExternalID)
	assert.Equal(t, res.Name, modelAsset.Name)
	assert.Equal(t, res.RawData, modelAsset.RawData)
	assert.Equal(t, res.ComplianceRisk, modelAsset.ComplianceRisk)
}

func TestBuiltInCollectors(t *testing.T) {
	ctx := context.Background()

	t.Run("CustomCloudCollector fetches assets", func(t *testing.T) {
		c := &CustomCloudCollector{}
		assert.Equal(t, "Custom Cloud", c.ProviderName())

		assets, err := c.FetchAssets(ctx, nil, nil)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(assets), 3)
	})

	t.Run("AWSMockCollector fetches assets", func(t *testing.T) {
		c := &AWSMockCollector{}
		assert.Equal(t, "AWS", c.ProviderName())

		assets, err := c.FetchAssets(ctx, nil, nil)
		require.NoError(t, err)
		assert.Len(t, assets, 2)
	})

	t.Run("GitHubMockCollector fetches assets", func(t *testing.T) {
		c := &GitHubMockCollector{}
		assert.Equal(t, "GitHub", c.ProviderName())

		assets, err := c.FetchAssets(ctx, nil, nil)
		require.NoError(t, err)
		assert.Len(t, assets, 1)
	})
}
