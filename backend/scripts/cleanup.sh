#!/bin/bash
# ──────────────────────────────────────────────────────────────
# CQMP — Production Disk Cleanup & Optimization Script
# ──────────────────────────────────────────────────────────────
# This script diagnoses abnormal disk usage, purges bloated log
# files, deletes leftover archives, and frees gigabytes of space.
# ──────────────────────────────────────────────────────────────

TARGET_DIR="${1:-/home/httpferozamedici/public_html}"
BACKEND_DIR="$TARGET_DIR/api.ferozamedicinecorner.com"

echo "========================================================"
echo " CQMP Production Disk Cleanup Tool"
echo " Target Root: $TARGET_DIR"
echo " Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================================"

if [ ! -d "$TARGET_DIR" ]; then
    echo "Directory $TARGET_DIR does not exist. Checking current directory..."
    TARGET_DIR="$(pwd)"
    BACKEND_DIR="$TARGET_DIR"
fi

echo ""
echo "--- Top 15 Largest Files in $TARGET_DIR before cleanup ---"
find "$TARGET_DIR" -type f -exec du -h {} + 2>/dev/null | sort -rh | head -n 15

echo ""
echo "--- 1. Cleaning Log Files (storage/logs & error_log) ---"
# Truncate all .log files in backend storage/logs
if [ -d "$BACKEND_DIR/storage/logs" ]; then
    find "$BACKEND_DIR/storage/logs" -type f -name "*.log" | while read -r logfile; do
        size=$(du -h "$logfile" 2>/dev/null | cut -f1)
        echo "Truncating $logfile (was $size)..."
        : > "$logfile"
    done
fi

# Truncate any Apache/PHP error_log files in the tree
find "$TARGET_DIR" -type f -name "error_log" | while read -r errfile; do
    size=$(du -h "$errfile" 2>/dev/null | cut -f1)
    echo "Truncating $errfile (was $size)..."
    : > "$errfile"
done

echo ""
echo "--- 2. Checking for Leftover Archive Files (.zip, .tar.gz) ---"
find "$TARGET_DIR" -type f \( -name "*.zip" -o -name "*.tar.gz" -o -name "*.tgz" -o -name "*.tar" \) | while read -r arch; do
    size=$(du -h "$arch" 2>/dev/null | cut -f1)
    echo "Found archive: $arch ($size)"
    echo "Deleting archive $arch..."
    rm -f "$arch"
done

echo ""
echo "--- 3. Checking for Stray node_modules on Production Server ---"
find "$TARGET_DIR" -maxdepth 4 -type d -name "node_modules" | while read -r nmod; do
    size=$(du -sh "$nmod" 2>/dev/null | cut -f1)
    echo "Found node_modules: $nmod ($size)"
    echo "Deleting $nmod (production only needs compiled dist/ assets)..."
    rm -rf "$nmod"
done

echo ""
echo "--- 4. Clearing Laravel Framework Cache & Compiled Views ---"
if [ -d "$BACKEND_DIR/storage/framework" ]; then
    echo "Clearing compiled views..."
    rm -f "$BACKEND_DIR/storage/framework/views/"*.php 2>/dev/null
    
    echo "Clearing file cache..."
    rm -rf "$BACKEND_DIR/storage/framework/cache/data/"* 2>/dev/null
    
    echo "Clearing old file sessions..."
    rm -f "$BACKEND_DIR/storage/framework/sessions/"* 2>/dev/null
fi

echo ""
echo "--- 5. Laravel Artisan Cache Clear ---"
PHP="$(which php 2>/dev/null || echo '/usr/local/bin/php')"
if [ -f "$BACKEND_DIR/artisan" ]; then
    $PHP "$BACKEND_DIR/artisan" view:clear 2>/dev/null
    $PHP "$BACKEND_DIR/artisan" cache:clear 2>/dev/null
    $PHP "$BACKEND_DIR/artisan" config:cache 2>/dev/null
    $PHP "$BACKEND_DIR/artisan" route:cache 2>/dev/null
    echo "Artisan optimization refreshed."
fi

echo ""
echo "========================================================"
echo " Cleanup Complete!"
echo "--- Top 10 Largest Files in $TARGET_DIR after cleanup ---"
find "$TARGET_DIR" -type f -exec du -h {} + 2>/dev/null | sort -rh | head -n 10
echo "========================================================"
