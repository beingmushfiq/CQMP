#!/bin/bash
# ──────────────────────────────────────────────────────────────
# CQMP — Automated Production Update & Deployment Script
# ──────────────────────────────────────────────────────────────
# Automatically places updated frontend & backend files into their
# respective target directories, runs migrations, purges runaway
# logs, and refreshes application caches.
# ──────────────────────────────────────────────────────────────

set -e

# Target directories specified by user
FRONTEND_DIR="/home/httpferozamedici/serial.ferozamedicinecorner.com"
BACKEND_DIR="/home/httpferozamedici/api.ferozamedicinecorner.com"

# Check if directories exist under home directly, or under public_html/
if [ ! -d "$FRONTEND_DIR" ] && [ -d "/home/httpferozamedici/public_html/serial.ferozamedicinecorner.com" ]; then
    FRONTEND_DIR="/home/httpferozamedici/public_html/serial.ferozamedicinecorner.com"
fi

if [ ! -d "$BACKEND_DIR" ] && [ -d "/home/httpferozamedici/public_html/api.ferozamedicinecorner.com" ]; then
    BACKEND_DIR="/home/httpferozamedici/public_html/api.ferozamedicinecorner.com"
fi

echo "=========================================================="
echo " CQMP Automated Deployment & Directory Sync"
echo " Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo " Frontend Target : $FRONTEND_DIR"
echo " Backend Target  : $BACKEND_DIR"
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Verify target directories exist
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "ERROR: Frontend directory not found at $FRONTEND_DIR"
    exit 1
fi

if [ ! -d "$BACKEND_DIR" ]; then
    echo "ERROR: Backend directory not found at $BACKEND_DIR"
    exit 1
fi

PHP="$(which php 2>/dev/null || echo '/usr/local/bin/php')"

# ── 1. Deploy Frontend Files ──────────────────────────────────
echo ""
echo ">>> [1/5] Deploying Frontend (compiled dist/ assets)..."
if [ -d "$SCRIPT_DIR/frontend_dist" ]; then
    # Sync new compiled build into frontend directory
    cp -rf "$SCRIPT_DIR/frontend_dist/"* "$FRONTEND_DIR/"
    echo "✓ Frontend assets successfully copied to $FRONTEND_DIR"
elif [ -d "$SCRIPT_DIR/dist" ]; then
    cp -rf "$SCRIPT_DIR/dist/"* "$FRONTEND_DIR/"
    echo "✓ Frontend assets successfully copied to $FRONTEND_DIR"
else
    echo "Notice: No frontend_dist folder in current directory. Skipping frontend copy."
fi

# Ensure frontend .htaccess exists for SPA routing
if [ ! -f "$FRONTEND_DIR/.htaccess" ]; then
    echo "Creating SPA .htaccess in frontend directory..."
    cat << 'EOF' > "$FRONTEND_DIR/.htaccess"
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
EOF
    echo "✓ .htaccess created for frontend SPA."
fi

# ── 2. Deploy Backend Updated Files ───────────────────────────
echo ""
echo ">>> [2/5] Deploying Backend Updates..."
if [ -d "$SCRIPT_DIR/backend_update" ]; then
    cp -rf "$SCRIPT_DIR/backend_update/"* "$BACKEND_DIR/"
    echo "✓ Backend files successfully copied to $BACKEND_DIR"
else
    echo "Notice: No backend_update folder in current directory. Skipping backend copy."
fi

# Make scripts executable
if [ -d "$BACKEND_DIR/scripts" ]; then
    chmod +x "$BACKEND_DIR/scripts/"*.sh 2>/dev/null || true
fi

# ── 3. Run Database Migrations ─────────────────────────────────
echo ""
echo ">>> [3/5] Running Database Migrations (queue_order & schema)..."
if [ -f "$BACKEND_DIR/artisan" ]; then
    $PHP "$BACKEND_DIR/artisan" migrate --force
    echo "✓ Database migration completed."
fi

# ── 4. Disk Cleanup (Purge bloated logs & error_log) ───────────
echo ""
echo ">>> [4/5] Executing Disk Cleanup to recover space..."
# Truncate bloated logs
if [ -d "$BACKEND_DIR/storage/logs" ]; then
    find "$BACKEND_DIR/storage/logs" -type f -name "*.log" -exec truncate -s 0 {} + 2>/dev/null || true
    echo "✓ Truncated bloated logs in $BACKEND_DIR/storage/logs"
fi

# Clean Apache error_logs
find "$BACKEND_DIR" "$FRONTEND_DIR" -maxdepth 2 -type f -name "error_log" -exec truncate -s 0 {} + 2>/dev/null || true

# Run Artisan clean command if available
if [ -f "$BACKEND_DIR/artisan" ]; then
    $PHP "$BACKEND_DIR/artisan" app:clean-disk 2>/dev/null || true
fi

# ── 5. Optimize Laravel Caches ─────────────────────────────────
echo ""
echo ">>> [5/5] Refreshing Laravel Caches & Optimizations..."
if [ -f "$BACKEND_DIR/artisan" ]; then
    $PHP "$BACKEND_DIR/artisan" config:cache
    $PHP "$BACKEND_DIR/artisan" route:cache
    $PHP "$BACKEND_DIR/artisan" view:cache
    echo "✓ Laravel route, config, and view caches refreshed."
fi

echo ""
echo "=========================================================="
echo " DEPLOYMENT & CLEANUP FINISHED SUCCESSFULLY!"
echo " - Frontend live at: https://serial.ferozamedicinecorner.com"
echo " - Backend API at  : https://api.ferozamedicinecorner.com"
echo "=========================================================="
