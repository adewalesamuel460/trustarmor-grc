#!/bin/bash
set -e

echo "============================================"
echo "  TrustArmor GRC — Dev Environment Setup"
echo "============================================"

# ── 1. PostgreSQL ──────────────────────────────
echo ""
echo "▶ Installing PostgreSQL 16..."
sudo apt-get update -qq
sudo apt-get install -y -qq postgresql postgresql-client

echo "▶ Starting PostgreSQL service..."
sudo service postgresql start

# Give it a moment to start up fully
sleep 3

echo "▶ Creating database and user..."
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';" 2>/dev/null || true
sudo -u postgres createdb grc 2>/dev/null || echo "  (database 'grc' already exists)"

echo "✅ PostgreSQL ready at localhost:5432"

# ── 2. Redis ───────────────────────────────────
echo ""
echo "▶ Installing Redis..."
sudo apt-get install -y -qq redis-server

echo "▶ Starting Redis service..."
sudo service redis-server start
sleep 1

echo "✅ Redis ready at localhost:6379"

# ── 3. Go dependencies ─────────────────────────
echo ""
echo "▶ Installing Go backend dependencies..."
cd /workspaces/trustarmor-grc/backend
go mod download
echo "✅ Go modules downloaded"

# ── 4. Node / npm dependencies ─────────────────
echo ""
echo "▶ Installing Node.js frontend dependencies..."
cd /workspaces/trustarmor-grc/frontend
npm install
echo "✅ npm packages installed"

# ── Done ───────────────────────────────────────
echo ""
echo "============================================"
echo "  ✅ Setup complete!"
echo ""
echo "  To start the platform, open TWO terminals:"
echo ""
echo "  Terminal 1 — Backend:"
echo "    cd backend && go run ./cmd/api/main.go"
echo ""
echo "  Terminal 2 — Frontend:"
echo "    cd frontend && npm run dev"
echo ""
echo "  Then open the browser popup on port 3000."
echo "============================================"
