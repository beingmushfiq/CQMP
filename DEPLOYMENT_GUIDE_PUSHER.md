# cPanel deployment guide for CQMP with Pusher realtime

This guide is for deploying CQMP without SSH access using shared cPanel hosting.

## 1. Architecture

Use two subdomains:
- Frontend: https://serial.yourdomain.com
- Backend API: https://api.yourdomain.com

The frontend calls the backend API over HTTPS, and realtime queue updates use Pusher instead of Laravel Reverb in production. Local development can still use Reverb by default.

## 2. Required hosting setup

In cPanel:
1. Create a subdomain named serial.yourdomain.com
2. Create a subdomain named api.yourdomain.com
3. Create a MySQL database and a database user
4. Make sure the PHP version for the API subdomain is PHP 8.4 or newer

## 3. Backend deployment

### 3.1 Prepare the backend config locally
Copy the example file:

```bash
cp backend/.env.production.cpanel.example backend/.env
```

Edit the file and replace the placeholder values with your real values:
- APP_KEY
- DB_DATABASE
- DB_USERNAME
- DB_PASSWORD
- PUSHER_APP_ID
- PUSHER_APP_KEY
- PUSHER_APP_SECRET

### 3.2 Build the backend dependencies locally
Run this on your own machine:

```bash
cd backend
composer install --no-dev --optimize-autoloader
```

### 3.3 Upload the backend files
Upload the contents of the backend folder to the API subdomain root.

Important: the API subdomain document root must point to the Laravel public folder.

Example:
- /home/youruser/public_html/api/public

### 3.4 Set the backend document root correctly
In cPanel, the API subdomain should use the folder that contains the Laravel public directory as its document root.

## 4. Frontend deployment

### 4.1 Prepare the frontend config locally
Copy the example file:

```bash
cp frontend/.env.production.cpanel.example frontend/.env.production
```

Edit the file and replace the placeholder Pusher values.

### 4.2 Build the frontend locally
Run:

```bash
cd frontend
npm install
npm run build
```

### 4.3 Upload the built files
Upload the contents of the frontend/dist folder to the serial subdomain document root.

Example:
- /home/youruser/public_html/serial

Make sure the frontend .htaccess file is present. The project already includes one in frontend/public/.htaccess.

## 5. Database setup

Since you do not have SSH access:
1. Create the database in cPanel
2. Import your local database SQL export using phpMyAdmin
3. Make sure the tables are created before the app is tested

If you are starting fresh, run migrations locally first:

```bash
cd backend
php artisan migrate --force
```

Then export the database and import it in cPanel.

## 6. File permissions

Set writable permissions for:
- storage
- bootstrap/cache

Common values:
- 755 or 775 depending on hosting restrictions

## 7. Storage link

Laravel needs public file access for uploaded assets.

If your host allows symlinks, create a symlink from public/storage to storage/app/public.

If not, upload the contents of backend/storage/app/public into the API public/storage folder manually.

## 8. Test the deployment

After deployment:
1. Open https://api.yourdomain.com and confirm the Laravel app responds
2. Open https://serial.yourdomain.com and confirm the React app loads
3. Test login and queue actions
4. Confirm realtime updates appear through Pusher

## 9. Notes

- The app is now configured to use Pusher instead of Reverb, which makes it suitable for cPanel without SSH.
- If the realtime updates do not appear, the most common cause is incorrect Pusher keys or an incorrect backend broadcast configuration.
- If the API returns 500 errors, check the PHP version and the database credentials in the backend .env file.
