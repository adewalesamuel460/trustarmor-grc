#!/bin/bash
# post_create.sh — Runs ONCE when the Codespace container is first created.
# Sets up the database and installs dependencies.
set -e

echo "============================================"
echo "  TrustArmor GRC — First-time Setup"
echo "============================================"

# ── Ensure PostgreSQL is running and grc DB exists ──────────────────────────
echo "▶ Waiting for PostgreSQL to be ready..."
for i in $(seq 1 15); do
    if pg_isready -h 127.0.0.1 -U postgres -q 2>/dev/null; then
        echo "  ✅ PostgreSQL is ready"
        break
    fi
    echo "  Waiting... ($i/15)"
    sleep 2
done

echo "▶ Creating 'grc' database (if it doesn't exist)..."
PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -c "CREATE DATABASE grc;" 2>/dev/null || echo "  (database 'grc' already exists — skipping)"

# ── Go backend dependencies ────────────────────────────────────────────────
echo ""
echo "▶ Installing Go backend dependencies..."
cd /workspaces/trustarmor-grc/backend
go mod download
echo "  ✅ Go modules downloaded"

# ── Node.js frontend dependencies ──────────────────────────────────────────
echo ""
echo "▶ Installing frontend dependencies..."
cd /workspaces/trustarmor-grc/frontend
npm install
echo "  ✅ npm packages installed"

echo ""
echo "============================================"
echo "  ✅ First-time setup complete!"
echo ""
echo "  To start the platform, open TWO terminals:"
echo ""
echo "  Terminal 1 — Backend:"
echo "    cd backend && go run ./cmd/api/main.go"
echo ""
echo "  Terminal 2 — Frontend:"
echo "    cd frontend && npm run dev"
echo ""
echo "  Dev Login:"
echo "    Email   : admin@trustarmor.io"
echo "    Password: TrustArmor2026!"
echo "============================================"
