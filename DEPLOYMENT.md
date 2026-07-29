# CQMP — cPanel Production Deployment Guide

## Domain Configuration

| Subdomain | Document Root | Purpose |
|-----------|---------------|---------|
| `api.ferozamedicinecorner.com` | `/home/username/api.ferozamedicinecorner.com/public` | Laravel API + Reverb |
| `serial.ferozamedicinecorner.com` | `/home/username/serial.ferozamedicinecorner.com` | React SPA (static files) |

> **Critical:** The document root for the API must point to `public/`, not the root of the Laravel project. The `public/` directory is the only folder Apache should serve directly.

---

## Pre-Deployment Checklist

- [ ] SSL certificates active on both subdomains (required for SameSite=None cookies)
- [ ] MySQL database created in cPanel
- [ ] Database credentials noted
- [ ] SSH access confirmed (`ssh username@server`)
- [ ] PHP 8.3+ available (`php -v`)
- [ ] Composer available (`composer --version`)
- [ ] Node.js 18+ available (`node -v`)
- [ ] Production Reverb app key/secret generated (use `openssl rand -hex 32`)

---

## Step 1 — Build the Frontend (Local Machine)

Run on your **local machine** before uploading:

```bash
cd frontend

# Copy the env example and fill in your Reverb key
cp .env.example .env.production
# Edit .env.production — set VITE_REVERB_APP_KEY to your production key

# Install dependencies
npm install

# Build for production
npm run build
```

This creates `frontend/dist/` — upload these files to the server.

---

## Step 2 — Upload Files via SSH or cPanel File Manager

### Backend Upload

Upload the **entire backend/** directory (excluding `vendor/`, `node_modules/`, `.env`) to:
```
/home/username/api.ferozamedicinecorner.com/
```

Exclude list for upload:
```
backend/vendor/
backend/node_modules/
backend/.env
backend/storage/logs/*.log
backend/.phpunit.result.cache
```

### Frontend Upload

Upload the contents of `frontend/dist/` to:
```
/home/username/serial.ferozamedicinecorner.com/
```

> Upload the **contents** of `dist/`, not the `dist/` folder itself, so `index.html` is at the document root.

---

## Step 3 — SSH Deployment Commands

Connect via SSH:
```bash
ssh username@ferozamedicinecorner.com
cd ~/api.ferozamedicinecorner.com
```

### 3a — Install PHP Dependencies
```bash
composer install --no-dev --optimize-autoloader --no-interaction
```
- `--no-dev` excludes testing packages (faker, pail, pint, phpunit)
- `--optimize-autoloader` generates an optimized class map for faster autoloading

### 3b — Create and Configure .env
```bash
cp .env.example .env
nano .env   # Fill in all values
```

**Minimum required values to set:**
```env
APP_KEY=           # Generate with: php artisan key:generate --show
APP_URL=https://api.ferozamedicinecorner.com
FRONTEND_URL=https://serial.ferozamedicinecorner.com
DB_HOST=127.0.0.1
DB_DATABASE=your_cpanel_db_name
DB_USERNAME=your_cpanel_db_user
DB_PASSWORD=your_db_password
REVERB_APP_KEY=your-generated-key
REVERB_APP_SECRET=your-generated-secret
REVERB_APP_ID=cqmp-prod-001
SANCTUM_STATEFUL_DOMAINS=serial.ferozamedicinecorner.com
```

### 3c — Generate App Key
```bash
php artisan key:generate
```

### 3d — Run Migrations
```bash
# Run all migrations (creates all tables + production indexes)
php artisan migrate --force

# Optional: seed initial data (admin user, clinic, doctors)
php artisan db:seed --force
```

### 3e — Create Storage Symlink
```bash
php artisan storage:link
```
This creates `public/storage` → `storage/app/public` symlink for file uploads.

### 3f — Set Permissions
```bash
# Directories: 755 (owner rwx, group rx, world rx)
find . -type d -exec chmod 755 {} \;

# Files: 644 (owner rw, group r, world r)
find . -type f -exec chmod 644 {} \;

# .env must be readable only by the owner
chmod 600 .env

# Storage and cache must be writable by the web server
chmod -R 775 storage
chmod -R 775 bootstrap/cache
```

### 3g — Laravel Optimization Commands
```bash
# Cache all configuration (reads .env once, serves from cache)
php artisan config:cache

# Cache all routes (avoids route file parsing on each request)
php artisan route:cache

# Cache compiled views
php artisan view:cache

# Cache event/listener mappings
php artisan event:cache

# Generate optimized class map (already done by composer --optimize-autoloader)
php artisan optimize
```

---

## Step 4 — Frontend .htaccess for SPA

Create `/home/username/serial.ferozamedicinecorner.com/.htaccess`:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On

    # Force HTTPS
    RewriteCond %{HTTPS} off
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

    # Serve existing files/directories directly
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d

    # Catch-all: send all routes to index.html (React Router handles routing)
    RewriteRule ^ index.html [L]
</IfModule>

<IfModule mod_headers.c>
    # Security headers
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"

    # Cache hashed assets forever (Vite appends content hash to filenames)
    <FilesMatch "\.[0-9a-f]{8}\.(js|css|woff2?)$">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>

    # Never cache index.html (ensures users always get the latest app shell)
    <FilesMatch "^index\.html$">
        Header set Cache-Control "no-store, no-cache, must-revalidate"
    </FilesMatch>
</IfModule>

<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/css application/javascript
    AddOutputFilterByType DEFLATE image/svg+xml application/json
</IfModule>
```

---

## Step 5 — Apache Reverse Proxy for Reverb (WebSocket via Port 443)

> **Why:** Shared cPanel plans block port 8080 externally. By proxying WebSocket connections through Apache on port 443, you get WSS (encrypted WebSocket) on the standard HTTPS port without firewall issues.

Add to the virtual host config for `api.ferozamedicinecorner.com` (via cPanel → Apache Configuration, or `.htaccess`):

```apache
# In the VirtualHost block or via RewriteRules in .htaccess:
RewriteEngine On
RewriteCond %{HTTP:Upgrade} =websocket [NC]
RewriteRule /app/(.*) ws://127.0.0.1:8080/app/$1 [P,L]

# Optional: Proxy all /reverb/ prefixed paths
ProxyPass /app/ ws://127.0.0.1:8080/app/
ProxyPassReverse /app/ ws://127.0.0.1:8080/app/
```

> **Note:** If your cPanel doesn't allow ProxyPass, contact your host to enable `mod_proxy` and `mod_proxy_wstunnel`, or ask about dedicated Reverb hosting options.

---

## Rollback Commands

If something goes wrong, revert to the previous state:

```bash
# 1. Restore previous files (if you kept a backup)
cp -r ~/backups/api.ferozamedicinecorner.com.bak ~/api.ferozamedicinecorner.com

# 2. Roll back the last migration (production indexes only — safe)
php artisan migrate:rollback --step=1

# 3. Clear all caches after rollback
php artisan optimize:clear

# 4. Restart queue workers
php artisan queue:restart
```

---

## Health Check Commands

Run after deployment to verify everything is working:

```bash
# Check Laravel is responding
curl -s https://api.ferozamedicinecorner.com/up

# Check API login endpoint is reachable
curl -s -X POST https://api.ferozamedicinecorner.com/api/v1/login \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}' | python3 -m json.tool

# Check public doctors endpoint
curl -s https://api.ferozamedicinecorner.com/api/v1/public/doctors | python3 -m json.tool

# Verify no debug info leaks
curl -s https://api.ferozamedicinecorner.com/api/v1/nonexistent | python3 -m json.tool

# Check storage symlink
ls -la public/storage

# Check cache is working
php artisan cache:clear && php artisan config:cache && echo "OK"
```
