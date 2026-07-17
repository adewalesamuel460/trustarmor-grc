#!/bin/bash
# post_start.sh — Runs on EVERY Codespace session start/resume.
# Services provided by devcontainer features auto-start, but we verify them
# and ensure the DB exists in case this is a fresh volume.

echo "▶ Verifying PostgreSQL..."
if pg_isready -h 127.0.0.1 -U postgres -q 2>/dev/null; then
    # Make sure the grc database exists
    PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -c "CREATE DATABASE grc;" 2>/dev/null || true
    echo "  ✅ PostgreSQL ready at 127.0.0.1:5432"
else
    echo "  ⚠️  PostgreSQL not ready — attempting to start..."
    # Fallback for environments where the feature service needs a nudge
    sudo service postgresql start 2>/dev/null || sudo pg_ctlcluster 16 main start 2>/dev/null || true
    sleep 3
    PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -c "CREATE DATABASE grc;" 2>/dev/null || true
fi

echo "▶ Verifying Redis..."
if redis-cli -h 127.0.0.1 ping 2>/dev/null | grep -q PONG; then
    echo "  ✅ Redis ready at 127.0.0.1:6379"
else
    echo "  ⚠️  Redis not ready — attempting to start..."
    sudo service redis-server start 2>/dev/null || redis-server --daemonize yes 2>/dev/null || true
    sleep 1
fi

echo ""
echo "  Dev Login:"
echo "    Email   : admin@trustarmor.io"
echo "    Password: TrustArmor2026!"
echo ""
echo "  Start backend : cd backend && go run ./cmd/api/main.go"
echo "  Start frontend: cd frontend && npm run dev"
