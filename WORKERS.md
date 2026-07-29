# CQMP — Queue Workers & Reverb Strategy (cPanel)

## The Challenge

Shared cPanel hosting does not provide Supervisor (the standard tool for
managing persistent background processes in Laravel). This guide explains
how to run `queue:work` and `reverb:start` reliably on a shared host.

---

## Option A — cPanel Cron Jobs (Recommended for shared hosting)

### Queue Worker via Cron

Instead of `queue:work` (persistent), use `queue:listen` triggered every minute.
Each invocation processes available jobs and exits cleanly.

**Add this cron in cPanel → Cron Jobs:**

```
* * * * * /usr/local/bin/php /home/username/api.ferozamedicinecorner.com/artisan queue:work database --sleep=3 --tries=3 --max-time=55 --stop-when-empty 2>&1 >> /home/username/api.ferozamedicinecorner.com/storage/logs/queue-worker.log
```

- `--max-time=55` ensures the process exits before the next cron fires (60s interval)
- `--stop-when-empty` exits as soon as the queue is drained
- `--tries=3` retries failed jobs 3 times before marking as failed
- This approach is cPanel-safe — no persistent process, no host kill

### Schedule Runner via Cron

Required for `php artisan schedule:run` (Laravel Scheduler):

```
* * * * * /usr/local/bin/php /home/username/api.ferozamedicinecorner.com/artisan schedule:run >> /dev/null 2>&1
```

---

## Option B — nohup Background Processes (VPS/Semi-dedicated)

If your cPanel plan allows persistent SSH processes:

### Start Queue Worker
```bash
nohup php artisan queue:work database \
  --sleep=3 \
  --tries=3 \
  --timeout=90 \
  >> storage/logs/queue-worker.log 2>&1 &

echo $! > storage/queue-worker.pid
```

### Start Reverb WebSocket Server
```bash
nohup php artisan reverb:start \
  --host=127.0.0.1 \
  --port=8080 \
  >> storage/logs/reverb.log 2>&1 &

echo $! > storage/reverb.pid
```

### Stop Workers
```bash
# Queue worker — graceful stop after current job
kill $(cat storage/queue-worker.pid)
php artisan queue:restart   # signals all workers to stop after current job

# Reverb
kill $(cat storage/reverb.pid)
```

---

## Option C — Auto-Restart via Cron (Persistent + Auto-Recovery)

This is a hybrid approach: run persistent processes AND use a cron "watchdog"
to restart them if they crash.

### Watchdog Script

Create `/home/username/scripts/start-workers.sh`:

```bash
#!/bin/bash
APP_DIR="/home/username/api.ferozamedicinecorner.com"
PHP="/usr/local/bin/php"
LOG_DIR="$APP_DIR/storage/logs"

# ── Queue Worker ──────────────────────────────────────────
if ! pgrep -f "artisan queue:work" > /dev/null; then
    echo "[$(date)] Starting queue worker..." >> $LOG_DIR/watchdog.log
    nohup $PHP $APP_DIR/artisan queue:work database \
        --sleep=3 \
        --tries=3 \
        --timeout=90 \
        >> $LOG_DIR/queue-worker.log 2>&1 &
fi

# ── Reverb WebSocket ──────────────────────────────────────
if ! pgrep -f "artisan reverb:start" > /dev/null; then
    echo "[$(date)] Starting Reverb..." >> $LOG_DIR/watchdog.log
    nohup $PHP $APP_DIR/artisan reverb:start \
        --host=127.0.0.1 \
        --port=8080 \
        >> $LOG_DIR/reverb.log 2>&1 &
fi
```

Make it executable:
```bash
chmod +x ~/scripts/start-workers.sh
```

### Cron Watchdog (every 5 minutes)
```
*/5 * * * * /bin/bash /home/username/scripts/start-workers.sh
```

---

## Artisan Commands Reference

```bash
# ── Queue ─────────────────────────────────────────────────────────
# Start a persistent queue worker
php artisan queue:work database --sleep=3 --tries=3 --timeout=90

# Gracefully restart all queue workers (after deployment)
php artisan queue:restart

# View failed jobs
php artisan queue:failed

# Retry all failed jobs
php artisan queue:retry all

# Clear failed jobs table
php artisan queue:flush

# ── Reverb ────────────────────────────────────────────────────────
# Start WebSocket server on localhost:8080
php artisan reverb:start --host=127.0.0.1 --port=8080

# Start with verbose debug output (development only)
php artisan reverb:start --debug

# ── Scheduler ─────────────────────────────────────────────────────
# Manually trigger all due scheduled commands
php artisan schedule:run

# ── Maintenance ───────────────────────────────────────────────────
# Enter maintenance mode (shows 503 to all users)
php artisan down --secret="your-bypass-secret" --render="errors.503"

# Exit maintenance mode
php artisan up

# ── Cache Management ──────────────────────────────────────────────
# Re-cache after .env changes
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Clear all caches (use before re-caching after deployment)
php artisan optimize:clear

# ── After Deployment ──────────────────────────────────────────────
# Full optimization sequence (run in this order)
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
php artisan queue:restart
```

---

## Log Locations

| Log | Path |
|-----|------|
| Laravel app | `storage/logs/laravel.log` |
| Queue worker | `storage/logs/queue-worker.log` |
| Reverb WS | `storage/logs/reverb.log` |
| Watchdog | `storage/logs/watchdog.log` |
| Apache errors | `/var/log/apache2/error.log` (ask host) |

---

## Monitoring

Check worker status:
```bash
# Is queue worker running?
pgrep -a -f "artisan queue:work"

# Is Reverb running?
pgrep -a -f "artisan reverb:start"

# How many jobs are pending?
php artisan queue:monitor database

# Recent log tail
tail -f storage/logs/laravel.log
tail -f storage/logs/reverb.log
```
