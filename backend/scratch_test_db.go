package main

import (
	"context"
	"log"
	"os"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/db"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
)

func main() {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgres://postgres:postgres@localhost:5432/grc?sslmode=disable"
	}

	log.Printf("Connecting to database: %s", connStr)
	database, err := db.Connect(context.Background(), connStr)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Try to query frameworks table
	var count int
	err = database.Pool.QueryRow(context.Background(), "SELECT count(*) FROM frameworks").Scan(&count)
	if err != nil {
		log.Fatalf("Failed to query frameworks table: %v", err)
	}
	log.Printf("Current frameworks count: %d", count)

	// Try to insert a mock framework
	f := models.Framework{
		Name:        "Test ISO 27001",
		Version:     "2022",
		Description: "Test ISO description",
	}

	err = database.Pool.QueryRow(context.Background(), `
		INSERT INTO frameworks (name, version, description)
		VALUES ($1, $2, $3)
		RETURNING id, created_at;
	`, f.Name, f.Version, f.Description).Scan(&f.ID, &f.CreatedAt)

	if err != nil {
		log.Fatalf("Failed to insert mock framework: %v", err)
	}

	log.Printf("Successfully inserted mock framework! ID: %s, CreatedAt: %v", f.ID, f.CreatedAt)

	// Clean it up
	_, err = database.Pool.Exec(context.Background(), "DELETE FROM frameworks WHERE name = $1", f.Name)
	if err != nil {
		log.Printf("Failed to delete mock framework: %v", err)
	} else {
		log.Printf("Cleaned up mock framework successfully.")
	}
}
