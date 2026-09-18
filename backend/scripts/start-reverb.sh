#!/bin/bash
# ──────────────────────────────────────────────────────────────
# CQMP — Reverb WebSocket & Queue Worker Watchdog Daemon Script
# ──────────────────────────────────────────────────────────────
# Usage: Run every 1-5 minutes via cPanel Cron Job to ensure
# background processes stay running 24/7.
# ──────────────────────────────────────────────────────────────

# Path to your backend directory on cPanel (adjust home username if needed)
APP_DIR="/home/httpferozamedici/public_html/api.ferozamedicinecorner.com"

# Fallback to direct path if APP_DIR doesn't exist
if [ ! -d "$APP_DIR" ]; then
    APP_DIR="/home/httpferozamedici/public_html/api.ferozamedicinecorner.com"
fi

# Detect PHP CLI binary location
PHP="$(which php 2>/dev/null || echo '/usr/local/bin/php')"
LOG_DIR="$APP_DIR/storage/logs"

# Ensure storage/logs directory exists
mkdir -p "$LOG_DIR"

# ── Auto-rotate & truncate logs if they exceed 5MB ─────────
rotate_log() {
    local file="$1"
    local max_bytes=5242880 # 5 MB cap
    if [ -f "$file" ]; then
        local size
        size=$(wc -c < "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0)
        if [ "$size" -gt "$max_bytes" ]; then
            tail -n 1000 "$file" > "${file}.tmp" 2>/dev/null && mv -f "${file}.tmp" "$file" 2>/dev/null
        fi
    fi
}

rotate_log "$LOG_DIR/watchdog.log"
rotate_log "$LOG_DIR/reverb.log"
rotate_log "$LOG_DIR/queue.log"
rotate_log "$LOG_DIR/laravel.log"
rotate_log "$LOG_DIR/queue-worker.log"

# Also clean any Apache error_log in root if larger than 10MB
if [ -f "$APP_DIR/error_log" ]; then
    rotate_log "$APP_DIR/error_log"
fi

# ── 1. Reverb WebSocket Server ─────────────────────────────
# Check by process name or port 8080
if ! pgrep -f "artisan reverb:start" > /dev/null 2>&1; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Reverb WebSocket server..." >> "$LOG_DIR/watchdog.log"
    nohup $PHP "$APP_DIR/artisan" reverb:start --host=127.0.0.1 --port=8080 >> "$LOG_DIR/reverb.log" 2>&1 &
fi

# ── 2. Queue Worker ─────────────────────────────────────────
if ! pgrep -f "artisan queue:work" > /dev/null 2>&1; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Queue Worker..." >> "$LOG_DIR/watchdog.log"
    nohup $PHP "$APP_DIR/artisan" queue:work database --sleep=3 --tries=3 --timeout=90 --stop-when-empty >> "$LOG_DIR/queue.log" 2>&1 &
fi
