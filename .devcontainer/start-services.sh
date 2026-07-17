#!/bin/bash
# start-services.sh — Runs on every Codespace session start (postStartCommand)
# Restarts PostgreSQL and Redis which do not persist across Codespace reconnects.

echo "▶ Starting PostgreSQL..."
sudo service postgresql start 2>/dev/null
sleep 2

# Ensure the grc database exists (idempotent)
sudo -u postgres createdb grc 2>/dev/null || true
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';" 2>/dev/null || true

echo "▶ Starting Redis..."
sudo service redis-server start 2>/dev/null
sleep 1

echo ""
echo "✅ Services ready:"
echo "   PostgreSQL → localhost:5432  (db: grc, user: postgres, pass: postgres)"
echo "   Redis      → localhost:6379"
echo ""
echo "To start the platform, open TWO terminals:"
echo ""
echo "  Terminal 1 — Backend:"
echo "    cd backend && go run ./cmd/api/main.go"
echo ""
echo "  Terminal 2 — Frontend:"
echo "    cd frontend && npm run dev"
echo ""
echo "  Then open the browser popup on port 3000."
