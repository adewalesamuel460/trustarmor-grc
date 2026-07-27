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

func TestCustomCloudCollector(t *testing.T) {
	ctx := context.Background()

	c := &CustomCloudCollector{}
	assert.Equal(t, "Custom Cloud", c.ProviderName())

	assets, err := c.FetchAssets(ctx, nil, nil)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(assets), 3)
}

func TestAWSCollector_ParseCredentialsAndErrorHandling(t *testing.T) {
	ctx := context.Background()
	c := NewAWSCollector()
	assert.Equal(t, "AWS", c.ProviderName())

	t.Run("Parse valid JSON credentials", func(t *testing.T) {
		jsonCreds := []byte(`{"access_key_id":"AKIAIOSFODNN7EXAMPLE","secret_access_key":"wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY","region":"us-west-2"}`)
		creds, err := parseAWSCreds(jsonCreds)
		require.NoError(t, err)
		assert.Equal(t, "AKIAIOSFODNN7EXAMPLE", creds.AccessKeyID)
		assert.Equal(t, "us-west-2", creds.Region)
	})

	t.Run("Parse colon separated credentials", func(t *testing.T) {
		raw := []byte("AKIA12345:secret6789:eu-west-1")
		creds, err := parseAWSCreds(raw)
		require.NoError(t, err)
		assert.Equal(t, "AKIA12345", creds.AccessKeyID)
		assert.Equal(t, "secret6789", creds.SecretAccessKey)
		assert.Equal(t, "eu-west-1", creds.Region)
	})

	t.Run("Return error on empty/invalid credentials", func(t *testing.T) {
		_, err := c.FetchAssets(ctx, nil, nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "credential parsing failed")
	})
}

func TestGitHubCollector_ParseCredentialsAndErrorHandling(t *testing.T) {
	ctx := context.Background()
	c := NewGitHubCollector()
	assert.Equal(t, "GitHub", c.ProviderName())

	t.Run("Parse valid JSON token credentials", func(t *testing.T) {
		jsonCreds := []byte(`{"token":"ghp_testtoken123","owner":"company","repo":"app"}`)
		creds, err := parseGitHubCreds(jsonCreds)
		require.NoError(t, err)
		assert.Equal(t, "ghp_testtoken123", creds.Token)
		assert.Equal(t, "company", creds.Owner)
		assert.Equal(t, "app", creds.Repo)
	})

	t.Run("Parse raw token string", func(t *testing.T) {
		raw := []byte("ghp_rawtoken456")
		creds, err := parseGitHubCreds(raw)
		require.NoError(t, err)
		assert.Equal(t, "ghp_rawtoken456", creds.Token)
	})

	t.Run("Return error on empty credentials", func(t *testing.T) {
		_, err := c.FetchAssets(ctx, nil, nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "credential parsing failed")
	})
}
