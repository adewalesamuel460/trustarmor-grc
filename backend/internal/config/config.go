package config

import (
	"os"
)

type Config struct {
	DatabaseURL string
	JWTSecret   string
	Port        string
}

func Load() *Config {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/grc?sslmode=disable"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "trustarmor_development_secret_key_1234567890"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	return &Config{
		DatabaseURL: dbURL,
		JWTSecret:   jwtSecret,
		Port:        port,
	}
}
