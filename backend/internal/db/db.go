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

	log.Println("Migrations executed successfully")
	return nil
}
