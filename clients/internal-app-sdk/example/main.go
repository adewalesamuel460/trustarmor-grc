package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	sdk "github.com/adewalesamuel460/trustarmor-grc/clients/internal-app-sdk"
)

func main() {
	log.Println("🚀 Starting Internal App Compliance Reporting Agent...")

	// 1. Read environment variables or configuration settings
	baseURL := getEnv("TRUSTARMOR_URL", "http://localhost:8000")
	workspaceID := getEnv("TRUSTARMOR_WORKSPACE_ID", "b1000000-0000-0000-0000-000000000099")
	connectionID := getEnv("TRUSTARMOR_CONNECTION_ID", "")
	productID := getEnv("TRUSTARMOR_PRODUCT_ID", "e1000000-0000-0000-0000-000000000001") // SCM
	apiKey := getEnv("TRUSTARMOR_API_KEY", "")

	if apiKey == "" || connectionID == "" {
		log.Println("ℹ️ TRUSTARMOR_API_KEY or TRUSTARMOR_CONNECTION_ID missing from environment.")
		log.Println("Run `POST /workspaces/{id}/integrations/connect` with provider_id='internal_app' to generate an API key.")
		log.Println("Simulating sample reporting output...")
	}

	// 2. Initialize SDK client
	client, err := sdk.NewClient(sdk.Config{
		TrustArmorURL: baseURL,
		WorkspaceID:   workspaceID,
		ConnectionID:  connectionID,
		ProductID:     productID,
		APIKey:        apiKey,
		Timeout:       5 * time.Second,
		MaxRetries:    3,
	})
	if err != nil && apiKey != "" {
		log.Fatalf("Failed to initialize SDK client: %v", err)
	}

	// 3. Collect state
	collector := &sdk.SampleStateCollector{AppName: "SCM"}
	assets := collector.GatherComplianceState()

	log.Printf("📊 Gathered %d local compliance asset(s) for product SCM:", len(assets))
	for _, a := range assets {
		log.Printf("   - [%s] %s (ID: %s)", a.AssetType, a.Name, a.ExternalID)
	}

	if apiKey != "" && connectionID != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		log.Println("📡 Transmitting telemetry to TrustArmor GRC...")
		res, err := client.ReportAssets(ctx, assets)
		if err != nil {
			log.Fatalf("❌ Error reporting assets to TrustArmor: %v", err)
		}
		fmt.Printf("✅ Telemetry ingested successfully! Ingested %d record(s) at %s.\n", res.RecordsIngested, res.SyncedAt)
	} else {
		log.Println("✅ Telemetry collection verified cleanly (Dry-run mode).")
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
