package db

import (
	"context"
	_ "embed"
	"fmt"
	"log"
	"time"

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

type DB struct {
	Pool *pgxpool.Pool
}

func Connect(ctx context.Context, connString string) (*DB, error) {
	var pool *pgxpool.Pool
	var err error

	// Retry connection for up to 10 seconds to allow DB startup
	for i := 0; i < 5; i++ {
		pool, err = pgxpool.New(ctx, connString)
		if err == nil {
			err = pool.Ping(ctx)
			if err == nil {
				log.Println("Successfully connected to PostgreSQL database")
				return &DB{Pool: pool}, nil
			}
		}

		log.Printf("Failed to connect to database (attempt %d/5): %v. Retrying in 2 seconds...", i+1, err)
		time.Sleep(2 * time.Second)
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

	log.Println("Migrations executed successfully")
	return nil
}
