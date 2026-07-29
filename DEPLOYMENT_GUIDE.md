# CQMP Production Deployment Guide

## Safety boundaries

Do not modify the main domain at ferozamedicinecorner.com or its existing document root, .htaccess, database, PHP settings, or shared hosting files.

Deploy only to these targets:

- Frontend: https://serial.ferozamedicinecorner.com/
- Backend API: https://api.ferozamedicinecorner.com/

## 1. Backend deployment (API subdomain)

1. Create a separate document root for the API subdomain.
2. Upload the contents of the backend folder to that document root.
3. Point the subdomain to that document root.
4. Create a separate MySQL database for CQMP.
5. Configure the environment file with production values:

> Required server runtime: PHP 8.4.1 or newer (PHP 8.4 or 8.5 recommended). If your host still serves PHP 8.3, Composer and Laravel will fail with the same dependency error shown above.

```env
APP_NAME="Clinic Queue Management Platform"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.ferozamedicinecorner.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=<new_cqmp_db>
DB_USERNAME=<db_user>
DB_PASSWORD=<db_password>

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_DOMAIN=.ferozamedicinecorner.com

BROADCAST_CONNECTION=reverb
CACHE_STORE=database
QUEUE_CONNECTION=database
FILESYSTEM_DISK=local

SANCTUM_STATEFUL_DOMAINS=serial.ferozamedicinecorner.com
```

6. Run database migrations and storage link:

```bash
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

7. Ensure the API subdomain uses the backend public directory as its document root.

## 2. Frontend deployment (serial subdomain)

1. Create a separate document root for the serial subdomain.
2. Build the frontend with the API URL set to the API subdomain:

```bash
cd frontend
cp .env.production.example .env.production
npm install
npm run build
```

3. Upload the contents of the frontend/dist directory to the serial document root.
4. Make sure the host serves the generated index.html correctly, using the provided public/.htaccess rewrite rules.

Set the production environment variable:

```env
VITE_API_BASE_URL=https://api.ferozamedicinecorner.com/api/v1
```

## 3. Reverb/WebSocket note

If real-time updates are required, deploy Laravel Reverb on the API subdomain or a dedicated host and set the frontend Reverb values accordingly:

```env
VITE_REVERB_APP_KEY=<your-key>
VITE_REVERB_HOST=api.ferozamedicinecorner.com
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
```

## 4. Important notes

- Keep the existing main website untouched.
- Do not reuse the main domain document root.
- Do not change the main domain .htaccess or PHP configuration.
- Use separate databases and separate document roots for the new services.

---

# cPanel deployment plan for the new subdomains

## A. Create the hosting structure

1. Create a new subdomain for the frontend:
   - serial.ferozamedicinecorner.com
2. Create a new subdomain for the API:
   - api.ferozamedicinecorner.com
3. Point each subdomain to its own document root.
   - Frontend document root: the folder containing the built React files
   - API document root: the backend/public folder
4. Create a separate MySQL database for CQMP and a dedicated database user.
5. Do not touch the existing main domain document root or database.

## B. Deploy the Laravel API

1. Upload the contents of the backend folder to the API subdomain document root.
2. Ensure the document root points to the backend/public folder inside the uploaded project.
   - In your current setup, if the project is uploaded under public_html/api.ferozamedicinecorner.com/backend, then the subdomain document root should be public_html/api.ferozamedicinecorner.com/backend/public, not public_html/api.ferozamedicinecorner.com/backend itself.
   - This is important because Laravel expects the web entry point to be the public directory so requests like https://api.ferozamedicinecorner.com/resolve correctly.
3. Create a production .env file with values similar to:

```env
APP_NAME="Clinic Queue Management Platform"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.ferozamedicinecorner.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=cqmp_prod
DB_USERNAME=cqmp_user
DB_PASSWORD=strong_password

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_DOMAIN=.ferozamedicinecorner.com

BROADCAST_CONNECTION=reverb
CACHE_STORE=database
QUEUE_CONNECTION=database
FILESYSTEM_DISK=local

SANCTUM_STATEFUL_DOMAINS=serial.ferozamedicinecorner.com
CORS_ALLOWED_ORIGINS=https://serial.ferozamedicinecorner.com

REVERB_APP_KEY=cqmp-reverb-key
REVERB_APP_SECRET=cqmp-reverb-secret
REVERB_APP_ID=cqmp-reverb-id
REVERB_HOST=api.ferozamedicinecorner.com
REVERB_PORT=443
REVERB_SCHEME=https
```

4. Run these commands on the server:

```bash
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan queue:table --force
php artisan optimize
```

5. Set writable permissions for the storage and bootstrap/cache folders.
6. Make sure the API can reach the MySQL database and that the PHP version on the server is 8.4.1+.
   - In cPanel, switch the subdomain’s PHP version to 8.4 or 8.5 via MultiPHP Manager or PHP Selector.
   - If you use SSH, verify with: `php -v`
   - If the CLI and PHP-FPM versions differ, align them so Composer and the web server use the same runtime.

## C. Deploy the React frontend

1. Build the frontend locally with the production API URL:

```bash
cd frontend
npm install
VITE_API_BASE_URL=https://api.ferozamedicinecorner.com/api/v1 npm run build
```

2. Upload the contents of frontend/dist to the serial subdomain document root.
3. Ensure the public/.htaccess rewrite rules are present on the frontend host.
4. Set the frontend production environment variable for the deployed site:

```env
VITE_API_BASE_URL=https://api.ferozamedicinecorner.com/api/v1
VITE_REVERB_APP_KEY=replace_with_real_key
VITE_REVERB_HOST=api.ferozamedicinecorner.com
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
```

## D. CORS configuration

The Laravel API must allow requests from the frontend subdomain. Add the following to the backend environment file:

```env
CORS_ALLOWED_ORIGINS=https://serial.ferozamedicinecorner.com
```

This is now supported by the new backend config file at backend/config/cors.php.

If the frontend later uses additional origins, add them as a comma-separated list.

### How to generate real Reverb values

For a real production deployment, generate your own Reverb credentials instead of reusing example values.

Run this on the server inside the Laravel backend folder:

```bash
php artisan reverb:key generate
```

This will create a valid app key, secret, and ID pair for the Reverb configuration. Use the generated values in:

```env
REVERB_APP_KEY=...
REVERB_APP_SECRET=...
REVERB_APP_ID=...
```

If you prefer to generate them manually, use long random strings and keep them private.

## E. Production environment examples

Ready-to-copy templates are available in [backend/.env.production.example](backend/.env.production.example) and [frontend/.env.production.example](frontend/.env.production.example). Use them as the starting point for your server deployment and replace the placeholder values with your real credentials.

### Backend .env (API subdomain)

```env
APP_NAME="Clinic Queue Management Platform"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.ferozamedicinecorner.com
APP_KEY=base64:Q2xpbmljUXVldWVNYW5hZ2VtZW50UGxhdGZvcm0=

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=cqmp_prod
DB_USERNAME=cqmp_user
DB_PASSWORD=REPLACE_WITH_STRONG_PASSWORD

BROADCAST_CONNECTION=reverb
CACHE_STORE=database
QUEUE_CONNECTION=database
FILESYSTEM_DISK=local

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_DOMAIN=.ferozamedicinecorner.com
SESSION_SECURE_COOKIE=true

SANCTUM_STATEFUL_DOMAINS=serial.ferozamedicinecorner.com
CORS_ALLOWED_ORIGINS=https://serial.ferozamedicinecorner.com

REVERB_APP_KEY=cqmp-reverb-key
REVERB_APP_SECRET=cqmp-reverb-secret
REVERB_APP_ID=cqmp-reverb-id
REVERB_HOST=api.ferozamedicinecorner.com
REVERB_PORT=443
REVERB_SCHEME=https
```

### Frontend .env.production (serial subdomain)

```env
VITE_API_BASE_URL=https://api.ferozamedicinecorner.com/api/v1
VITE_REVERB_APP_KEY=REPLACE_WITH_REVERB_KEY
VITE_REVERB_HOST=api.ferozamedicinecorner.com
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
```

## F. cPanel upload sequence

### API subdomain upload order

1. Create the API subdomain and point it to a new document root.
2. Upload the backend project files to that document root.
3. Make sure the document root points to the backend/public directory.
4. Upload the production .env file.
5. Run the Laravel commands listed earlier.
6. Verify that https://api.ferozamedicinecorner.com/up returns a healthy response.

### Frontend subdomain upload order

1. Create the serial subdomain and point it to a new document root.
2. Upload the built frontend files from frontend/dist.
3. Ensure the public/.htaccess rewrite rules are present.
4. Upload the production environment file if your host uses one.
5. Verify that https://serial.ferozamedicinecorner.com loads the React app.

### Expected file layout

API subdomain document root:

```text
public_html/api/              (or your chosen API subdomain root)
├── artisan
├── composer.json
├── config/
├── public/
├── resources/
├── routes/
├── storage/
└── vendor/
```

Frontend subdomain document root:

```text
public_html/serial/           (or your chosen serial subdomain root)
├── index.html
├── assets/
├── favicon.svg
├── manifest.json
└── .htaccess
```

## G. SSL and domain notes

- Enable HTTPS for both subdomains.
- Keep the existing main domain at ferozamedicinecorner.com fully isolated.
- Do not reuse the current document root, .htaccess, database, or PHP configuration.

---

# Production Audit Summary

## Executive summary

The CQMP codebase is structurally strong and shows a credible Laravel 13 + React implementation for a clinic queue management workflow. The backend and frontend both build successfully, and the existing feature tests for queue flows are passing. The application is not yet fully hardened for a shared cPanel production environment, but it is in a good position to be deployed safely if the following production controls are applied.

## Verified evidence

- Backend feature tests: 10 tests passed, 10 passed, 32 assertions.
- Frontend production build: succeeded with Vite and generated a production bundle.

## Architecture overview

- Backend: Laravel 13 REST API with Sanctum authentication, queue business logic in the service layer, real-time events via Reverb/WebSockets, Filament admin panel, and MySQL-compatible migrations.
- Frontend: React 19 + TypeScript + Vite SPA with Zustand for state, Axios for API requests, and PWA support.
- Deployment target: separate subdomains for the frontend and API, with the existing main domain left untouched.

## Scores

- Code quality: 82/100
- Security: 74/100
- Performance: 79/100
- Production readiness: 78/100

## Critical issues

1. Production CORS and throttling are not yet explicitly hardened.
   - Impact: medium
   - Location: backend routes and deployment configuration
   - Solution: configure trusted origins, rate limiting, and strict Sanctum/CORS settings for the production subdomains.

2. Reverb/WebSocket is a production dependency that requires a dedicated host or subdomain setup.
   - Impact: high
   - Location: frontend echo configuration and backend broadcasting config
   - Solution: deploy Reverb behind the API domain or another dedicated WebSocket endpoint and set the frontend environment variables to those values.

3. There is no explicit production hardening for file storage and asset delivery.
   - Impact: medium
   - Location: backend storage and frontend asset serving
   - Solution: use the public storage disk carefully, ensure correct permissions, and consider a CDN or dedicated asset host for large media files.

4. Database indexes for high-traffic queue operations should be reviewed.
   - Impact: medium
   - Location: queue_items and queue_days tables
   - Solution: add indexes for queue_day_id, status, serial_no, and date/doctor_id combinations if the system scales beyond a small clinic workload.

5. Testing coverage is good for core queue flows but incomplete for security and authorization regressions.
   - Impact: medium
   - Location: backend tests
   - Solution: add tests for unauthorized access, throttling behavior, blocked patient handling, and profile update security.

## Backend audit report

Strengths:
- Clear service-based queue business logic.
- Database migrations are structured and role-based access is present.
- Queue operations are covered by feature tests.

Recommended improvements:
- Add route-level throttling to public booking and authentication routes.
- Introduce explicit authorization checks for receptionist and admin actions rather than relying only on being authenticated.
- Add request policies for queue mutations and patient management.
- Consider a consistent API response envelope for errors.

## Frontend audit report

Strengths:
- Vite production build succeeds.
- SPA routing support is present through the public .htaccess file.
- PWA support is included and the app is suitable for kiosk-style usage.

Recommended improvements:
- Split the large bundle further with lazy loading for non-critical components.
- Reduce the main JS payload by loading dashboard-heavy modules only when needed.
- Confirm the production API base URL and Reverb settings before launch.

## Database audit report

Strengths:
- Foreign keys and model relationships are present.
- Core queue and patient tables are well organized.

Recommended improvements:
- Review and index frequently queried columns such as queue_day_id, serial_no, status, date, and doctor_id.
- Ensure MySQL engine and collation choices are consistent for production.
- Add backup and retention strategy for audit logs and queue history.

## API audit report

Strengths:
- Routes are clearly grouped by public and protected areas.
- Queue operations are organized around a single controller.

Recommended improvements:
- Add rate limiting to /login, /public/book, and other public endpoints.
- Add a single error handling pattern for validation and authorization failures.
- Standardize resource responses for all endpoints.

## Security audit report

Strengths:
- Sanctum is used for authenticated API access.
- Passwords are hashed through the User model cast.
- Sensitive operations rely on authenticated sessions.

Recommended improvements:
- Configure strict CORS origins for serial.ferozamedicinecorner.com and api.ferozamedicinecorner.com.
- Keep APP_DEBUG=false and APP_ENV=production in the deployed environment.
- Use a strong, unique APP_KEY and rotate secrets before production launch.
- Set SANCTUM_STATEFUL_DOMAINS to the exact frontend hostnames.
- Ensure the WebSocket credentials are not exposed in public or default fallback values.

## Performance audit report

Strengths:
- Queue updates are reasonably lightweight and the frontend uses optimistic UI updates.
- The Vite build is successful and PWA caching is configured.

Recommended improvements:
- Use caching for public settings and doctor lists where appropriate.
- Add database indexes to reduce query load on large queues.
- Reduce large bundle size with route-level lazy loading.

## Deployment checklist

### cPanel configuration
- Create separate document roots for the frontend and backend.
- Keep the main domain and its existing files unchanged.
- Use separate MySQL databases for the new application.
- Set the API subdomain document root to the backend public folder.
- Set the serial subdomain document root to the frontend dist folder.

### Subdomain setup
- Configure serial.ferozamedicinecorner.com to the frontend build output.
- Configure api.ferozamedicinecorner.com to the backend public directory.
- Ensure SSL certificates are enabled for both subdomains.

### Laravel deployment
- Copy backend files to the API subdomain document root.
- Set APP_ENV=production and APP_DEBUG=false.
- Set APP_URL to the API domain.
- Create the production .env file with database, cache, queue, and broadcast settings.
- Run migrations, storage link, and cache warmup commands.

### React deployment
- Build the frontend with VITE_API_BASE_URL set to the API domain.
- Upload the contents of frontend/dist to the serial subdomain document root.
- Ensure SPA rewrite rules are active.

### Database migration
- Run migrations only against the new CQMP database.
- Do not reuse any existing production tables from the main domain.
- Verify the database user has the required privileges.

### SSL and security
- Enable HTTPS for both subdomains.
- Configure CORS to allow only the approved frontend origin.
- Set SANCTUM_STATEFUL_DOMAINS to the frontend domain(s).
- Keep debug and stack traces disabled in production.

### Environment configuration
- Use production values for APP_KEY, DB credentials, Reverb credentials, and broadcast settings.
- Keep secrets out of version control and avoid default development values in production.

## Final verdict

Production Ready After Minor Fixes.

The application is suitable for a staged production deployment when the subdomain hosting, Reverb/WebSocket setup, environment values, and basic hardening controls are configured correctly. The existing production site at ferozamedicinecorner.com remains unaffected as long as the deployment stays isolated to the new subdomains and separate database.
