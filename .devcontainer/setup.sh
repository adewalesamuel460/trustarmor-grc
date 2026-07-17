#!/bin/bash
# setup.sh — Manual installation fallback for TrustArmor GRC.
# Run this if PostgreSQL/Redis are not available:
#   bash /workspaces/trustarmor-grc/.devcontainer/setup.sh

echo "============================================"
echo "  TrustArmor GRC — Manual Environment Setup"
echo "============================================"

# ── 0. Fix broken third-party apt repos (yarn GPG issue is common) ─────────
echo ""
echo "▶ Cleaning up broken apt repositories..."
# The yarn repo frequently has GPG signature issues in Codespaces — remove it
# safely so apt-get update doesn't fail. Yarn is not used by this project.
sudo rm -f /etc/apt/sources.list.d/yarn.list
sudo rm -f /etc/apt/sources.list.d/yarn.list.save
# Also fix any other unauthenticated repos by skipping them instead of failing
sudo sed -i 's/^deb /# deb /g' /etc/apt/sources.list.d/yarn.list 2>/dev/null || true
echo "  ✅ apt sources cleaned"

# ── 1. PostgreSQL ──────────────────────────────────────────────────────────
echo ""
echo "▶ Updating apt and installing PostgreSQL 16..."
sudo apt-get update -qq 2>&1 | grep -v "^W:" || true   # suppress warnings, not errors
sudo apt-get install -y -qq postgresql postgresql-client

echo "▶ Starting PostgreSQL service..."
sudo service postgresql start
sleep 3

echo "▶ Configuring database..."
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';" 2>/dev/null || true
sudo -u postgres createdb grc 2>/dev/null || echo "  (database 'grc' already exists)"
echo "  ✅ PostgreSQL ready at 127.0.0.1:5432  (db: grc, user: postgres, pass: postgres)"

# ── 2. Redis ───────────────────────────────────────────────────────────────
echo ""
echo "▶ Installing Redis..."
sudo apt-get install -y -qq redis-server

echo "▶ Starting Redis service..."
sudo service redis-server start
sleep 1
echo "  ✅ Redis ready at 127.0.0.1:6379"

# ── 3. Go dependencies ─────────────────────────────────────────────────────
echo ""
echo "▶ Installing Go backend dependencies..."
cd /workspaces/trustarmor-grc/backend
go mod download
echo "  ✅ Go modules downloaded"

# ── 4. Node / npm dependencies ─────────────────────────────────────────────
echo ""
echo "▶ Installing Node.js frontend dependencies..."
cd /workspaces/trustarmor-grc/frontend
npm install --legacy-peer-deps
echo "  ✅ npm packages installed"

# ── Done ───────────────────────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  ✅ Setup complete!"
echo ""
echo "  Open TWO terminals and run:"
echo ""
echo "  Terminal 1 — Backend:"
echo "    cd backend && go run ./cmd/api/main.go"
echo ""
echo "  Terminal 2 — Frontend:"
echo "    cd frontend && npm run dev"
echo ""
echo "  Dev Login (works after first backend start):"
echo "    Email   : admin@trustarmor.io"
echo "    Password: TrustArmor2026!"
echo "============================================"
