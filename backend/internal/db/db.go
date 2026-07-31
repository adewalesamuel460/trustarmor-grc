package db

import (
	"context"
	_ "embed"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/000001_init_schema.up.sql
var initSchemaSQL string

//go:embed migrations/000002_audit_logs.up.sql
var auditLogsSQL string

//go:embed migrations/000003_grc_core.up.sql
var grcCoreSQL string

//go:embed migrations/000004_integrations.up.sql
var integrationsSQL string

//go:embed migrations/000005_evidence_monitoring.up.sql
var evidenceSQL string

//go:embed migrations/000006_policy_management.up.sql
var policySQL string

//go:embed migrations/000007_risk_register.up.sql
var riskSQL string

//go:embed migrations/000008_vendor_tprm.up.sql
var vendorSQL string

//go:embed migrations/000009_questionnaire_rag.up.sql
var questionnaireSQL string

//go:embed migrations/000010_trust_center.up.sql
var trustCenterSQL string

//go:embed migrations/000011_auditor_portal.up.sql
var auditorSQL string

//go:embed migrations/000012_access_reviews.up.sql
var accessReviewsSQL string

//go:embed migrations/000013_privacy_ai.up.sql
var privacyAiSQL string

//go:embed migrations/000014_tasks_notifications.up.sql
var tasksNotificationsSQL string

//go:embed migrations/000015_incident_vulnerability.up.sql
var incidentVulnerabilitySQL string

//go:embed migrations/000016_super_admin.up.sql
var superAdminSQL string

//go:embed migrations/000017_seed_expanded_frameworks.up.sql
var seedExpandedFrameworksSQL string

//go:embed migrations/000018_password_reset.up.sql
var passwordResetSQL string

//go:embed migrations/000019_seed_dev_user.up.sql
var seedDevUserSQL string

//go:embed migrations/000020_seed_workspace_demo_data.up.sql
var seedWorkspaceDemoDataSQL string

//go:embed migrations/000021_product_compliance.up.sql
var productComplianceSQL string

//go:embed migrations/000022_dynamic_product_suites.up.sql
var dynamicProductSuitesSQL string

//go:embed migrations/000023_update_nvuto_erp_products.up.sql
var updateNvutoErpProductsSQL string

//go:embed migrations/000024_fix_selective_control_products.up.sql
var fixSelectiveControlProductsSQL string

//go:embed migrations/000025_internal_app_integration.up.sql
var internalAppIntegrationSQL string

//go:embed migrations/000026_more_frameworks_dedup.up.sql
var moreFrameworksDedupSQL string

//go:embed migrations/000027_dedupe_framework_requirements.up.sql
var dedupeFrameworkRequirementsSQL string

//go:embed migrations/000028_seed_expanded_framework_controls.up.sql
var seedExpandedFrameworkControlsSQL string



type PgxPoolIface interface {





	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Begin(ctx context.Context) (pgx.Tx, error)
	Close()
	Ping(ctx context.Context) error
}

type DB struct {
	Pool PgxPoolIface
}

func Connect(ctx context.Context, connString string) (*DB, error) {
	return ConnectWithRetries(ctx, connString, 5)
}

// ConnectOnce tries exactly once — used by connectWithFallbacks so we fail fast
// between candidates instead of waiting 5×2=10 seconds per attempt.
func ConnectOnce(ctx context.Context, connString string) (*DB, error) {
	return ConnectWithRetries(ctx, connString, 1)
}

func ConnectWithRetries(ctx context.Context, connString string, maxAttempts int) (*DB, error) {
	var pool *pgxpool.Pool
	var err error

	for i := 0; i < maxAttempts; i++ {
		pool, err = pgxpool.New(ctx, connString)
		if err == nil {
			err = pool.Ping(ctx)
			if err == nil {
				return &DB{Pool: pool}, nil
			}
		}
		if i < maxAttempts-1 {
			log.Printf("Failed to connect to database (attempt %d/%d): %v. Retrying in 2 seconds...", i+1, maxAttempts, err)
			time.Sleep(2 * time.Second)
		}
	}
	return nil, fmt.Errorf("unable to connect to database after retries: %w", err)
}

func (db *DB) Close() {
	if db.Pool != nil {
		db.Pool.Close()
	}
}

func (db *DB) RunMigrations(ctx context.Context) error {
	log.Println("Running database migrations (000001)...")
	_, err := db.Pool.Exec(ctx, initSchemaSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000001: %w", err)
	}

	log.Println("Running database migrations (000002)...")
	_, err = db.Pool.Exec(ctx, auditLogsSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000002: %w", err)
	}

	log.Println("Running database migrations (000003)...")
	_, err = db.Pool.Exec(ctx, grcCoreSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000003: %w", err)
	}

	log.Println("Running database migrations (000004)...")
	_, err = db.Pool.Exec(ctx, integrationsSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000004: %w", err)
	}

	log.Println("Running database migrations (000005)...")
	_, err = db.Pool.Exec(ctx, evidenceSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000005: %w", err)
	}

	log.Println("Running database migrations (000006)...")
	_, err = db.Pool.Exec(ctx, policySQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000006: %w", err)
	}

	log.Println("Running database migrations (000007)...")
	_, err = db.Pool.Exec(ctx, riskSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000007: %w", err)
	}

	log.Println("Running database migrations (000008)...")
	_, err = db.Pool.Exec(ctx, vendorSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000008: %w", err)
	}

	log.Println("Running database migrations (000009)...")
	_, err = db.Pool.Exec(ctx, questionnaireSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000009: %w", err)
	}

	log.Println("Running database migrations (000010)...")
	_, err = db.Pool.Exec(ctx, trustCenterSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000010: %w", err)
	}

	log.Println("Running database migrations (000011)...")
	_, err = db.Pool.Exec(ctx, auditorSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000011: %w", err)
	}

	log.Println("Running database migrations (000012)...")
	_, err = db.Pool.Exec(ctx, accessReviewsSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000012: %w", err)
	}

	log.Println("Running database migrations (000013)...")
	_, err = db.Pool.Exec(ctx, privacyAiSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000013: %w", err)
	}

	log.Println("Running database migrations (000014)...")
	_, err = db.Pool.Exec(ctx, tasksNotificationsSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000014: %w", err)
	}

	log.Println("Running database migrations (000015)...")
	_, err = db.Pool.Exec(ctx, incidentVulnerabilitySQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000015: %w", err)
	}

	log.Println("Running database migrations (000016)...")
	_, err = db.Pool.Exec(ctx, superAdminSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000016: %w", err)
	}

	log.Println("Running database migrations (000017)...")
	_, err = db.Pool.Exec(ctx, seedExpandedFrameworksSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000017: %w", err)
	}

	log.Println("Running database migrations (000018)...")
	_, err = db.Pool.Exec(ctx, passwordResetSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000018: %w", err)
	}

	log.Println("Running database migrations (000019)...")
	_, err = db.Pool.Exec(ctx, seedDevUserSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000019: %w", err)
	}

	log.Println("Running database migrations (000020)...")
	_, err = db.Pool.Exec(ctx, seedWorkspaceDemoDataSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000020: %w", err)
	}

	log.Println("Running database migrations (000021)...")
	_, err = db.Pool.Exec(ctx, productComplianceSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000021: %w", err)
	}

	log.Println("Running database migrations (000022)...")
	_, err = db.Pool.Exec(ctx, dynamicProductSuitesSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000022: %w", err)
	}

	log.Println("Running database migrations (000023)...")
	_, err = db.Pool.Exec(ctx, updateNvutoErpProductsSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000023: %w", err)
	}

	log.Println("Running database migrations (000024)...")
	_, err = db.Pool.Exec(ctx, fixSelectiveControlProductsSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000024: %w", err)
	}

	log.Println("Running database migrations (000025)...")
	_, err = db.Pool.Exec(ctx, internalAppIntegrationSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000025: %w", err)
	}

	log.Println("Running database migrations (000026)...")
	_, err = db.Pool.Exec(ctx, moreFrameworksDedupSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000026: %w", err)
	}

	log.Println("Running database migrations (000027)...")
	_, err = db.Pool.Exec(ctx, dedupeFrameworkRequirementsSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000027: %w", err)
	}

	log.Println("Running database migrations (000028)...")
	_, err = db.Pool.Exec(ctx, seedExpandedFrameworkControlsSQL)
	if err != nil {
		return fmt.Errorf("failed to execute migration 000028: %w", err)
	}

	log.Println("Migrations executed successfully")
	return nil
}






