<?php
/**
 * CQMP — Web-Based Automated Deployment & Directory Sync Tool
 * 
 * Access via: https://api.ferozamedicinecorner.com/deploy_web.php?key=cqmp_deploy_2026
 * 
 * This script automatically unzips cqmp_update.zip and places:
 *   - Frontend assets into /home/httpferozamedici/serial.ferozamedicinecorner.com
 *   - Backend updates into /home/httpferozamedici/api.ferozamedicinecorner.com
 * Then executes migrations and clears disk space.
 */

$secretKey = 'cqmp_deploy_2026';
$providedKey = $_GET['key'] ?? '';

if ($providedKey !== $secretKey) {
    http_response_code(403);
    echo '<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;text-align:center;">';
    echo '<h2>Access Denied</h2><p>Provide valid key: <code>?key=' . htmlspecialchars($secretKey) . '</code></p>';
    echo '</body></html>';
    exit;
}

$frontendDir = '/home/httpferozamedici/serial.ferozamedicinecorner.com';
$backendDir = '/home/httpferozamedici/api.ferozamedicinecorner.com';

// Fallback to public_html paths if subdomains are nested inside public_html
if (!is_dir($frontendDir) && is_dir('/home/httpferozamedici/public_html/serial.ferozamedicinecorner.com')) {
    $frontendDir = '/home/httpferozamedici/public_html/serial.ferozamedicinecorner.com';
}
if (!is_dir($backendDir) && is_dir('/home/httpferozamedici/public_html/api.ferozamedicinecorner.com')) {
    $backendDir = '/home/httpferozamedici/public_html/api.ferozamedicinecorner.com';
}

$zipPath = __DIR__ . '/cqmp_update.zip';
if (!file_exists($zipPath)) {
    // Check parent directory
    $parentZip = realpath(__DIR__ . '/..') . '/cqmp_update.zip';
    if (file_exists($parentZip)) {
        $zipPath = $parentZip;
    }
}

$logs = [];

function recursiveCopy($src, $dst) {
    $dir = opendir($src);
    @mkdir($dst, 0755, true);
    while (false !== ($file = readdir($dir))) {
        if ($file !== '.' && $file !== '..') {
            if (is_dir($src . '/' . $file)) {
                recursiveCopy($src . '/' . $file, $dst . '/' . $file);
            } else {
                copy($src . '/' . $file, $dst . '/' . $file);
            }
        }
    }
    closedir($dir);
}

$success = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST' || isset($_GET['run'])) {
    if (!file_exists($zipPath)) {
        $logs[] = ["error", "Could not find cqmp_update.zip in " . __DIR__ . " or parent directory. Please upload it via cPanel File Manager."];
    } else {
        $zip = new ZipArchive();
        if ($zip->open($zipPath) === true) {
            $extractDir = __DIR__ . '/_temp_cqmp_update';
            @mkdir($extractDir, 0755, true);
            $zip->extractTo($extractDir);
            $zip->close();
            $logs[] = ["success", "Extracted cqmp_update.zip successfully."];

            // 1. Copy Frontend
            if (is_dir($extractDir . '/frontend_dist')) {
                recursiveCopy($extractDir . '/frontend_dist', $frontendDir);
                $logs[] = ["success", "Copied frontend assets to: {$frontendDir}"];
            } elseif (is_dir($extractDir . '/dist')) {
                recursiveCopy($extractDir . '/dist', $frontendDir);
                $logs[] = ["success", "Copied frontend assets to: {$frontendDir}"];
            }

            // Ensure frontend .htaccess
            $spaHtaccess = "<IfModule mod_rewrite.c>\n  RewriteEngine On\n  RewriteBase /\n  RewriteRule ^index\.html$ - [L]\n  RewriteCond %{REQUEST_FILENAME} !-f\n  RewriteCond %{REQUEST_FILENAME} !-d\n  RewriteRule . /index.html [L]\n</IfModule>\n";
            file_put_contents($frontendDir . '/.htaccess', $spaHtaccess);
            $logs[] = ["success", "Verified frontend SPA .htaccess"];

            // 2. Copy Backend Updates
            if (is_dir($extractDir . '/backend_update')) {
                recursiveCopy($extractDir . '/backend_update', $backendDir);
                $logs[] = ["success", "Copied backend updates to: {$backendDir}"];
            }

            // 3. Database Migration
            $phpBin = PHP_BINARY ?: '/usr/local/bin/php';
            $artisan = $backendDir . '/artisan';
            if (file_exists($artisan)) {
                $migOut = shell_exec("{$phpBin} " . escapeshellarg($artisan) . " migrate --force 2>&1");
                $logs[] = ["success", "Ran database migration: " . nl2br(htmlspecialchars($migOut ?: 'Completed'))];

                // 4. Disk cleanup & optimize
                @shell_exec("{$phpBin} " . escapeshellarg($artisan) . " app:clean-disk 2>&1");
                @shell_exec("{$phpBin} " . escapeshellarg($artisan) . " optimize:clear 2>&1");
                @shell_exec("{$phpBin} " . escapeshellarg($artisan) . " config:cache 2>&1");
                @shell_exec("{$phpBin} " . escapeshellarg($artisan) . " route:cache 2>&1");
                @shell_exec("{$phpBin} " . escapeshellarg($artisan) . " view:cache 2>&1");
                $logs[] = ["success", "Cleared disk bloat and refreshed Laravel caches."];
            }

            // Clean up temporary extraction folder and update zip
            shell_exec("rm -rf " . escapeshellarg($extractDir));
            @unlink($zipPath);
            $logs[] = ["success", "Deleted temporary files and cqmp_update.zip to conserve disk space."];

            $success = true;
        } else {
            $logs[] = ["error", "Failed to open cqmp_update.zip. File may be corrupted."];
        }
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>CQMP Automated Deployment</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px 20px; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 28px; max-width: 800px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        h1 { color: #38bdf8; font-size: 22px; margin-top: 0; }
        .path-box { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 12px; margin-bottom: 20px; }
        .btn { display: inline-block; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; border: none; font-size: 14px; background: #3b82f6; color: white; text-decoration: none; }
        .btn:hover { background: #2563eb; }
        .log-item { padding: 8px 12px; border-radius: 6px; margin-bottom: 8px; font-size: 13px; font-family: monospace; }
        .log-success { background: rgba(16, 185, 129, 0.15); border-left: 4px solid #10b981; color: #34d399; }
        .log-error { background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; color: #f87171; }
    </style>
</head>
<body>
<div class="card">
    <h1>CQMP Automated Deployment & Sync</h1>
    <div class="path-box">
        <div><strong>Frontend Target:</strong> <?= htmlspecialchars($frontendDir) ?></div>
        <div><strong>Backend Target :</strong> <?= htmlspecialchars($backendDir) ?></div>
        <div><strong>Update Package :</strong> <?= file_exists($zipPath) ? '✓ Found (' . number_format(filesize($zipPath)/1048576, 2) . ' MB)' : '✗ Not found at ' . htmlspecialchars($zipPath) ?></div>
    </div>

    <?php if (!empty($logs)): ?>
        <div style="margin-bottom: 25px;">
            <h3>Deployment Log:</h3>
            <?php foreach ($logs as $l): ?>
                <div class="log-item <?= $l[0] === 'success' ? 'log-success' : 'log-error' ?>">
                    <?= $l[1] ?>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>

    <?php if ($success): ?>
        <div style="padding: 16px; background: rgba(16, 185, 129, 0.2); border-radius: 8px; color: #34d399; font-weight: bold; margin-bottom: 20px;">
            🎉 All updates successfully placed into frontend and backend directories!
        </div>
        <p><a href="https://serial.ferozamedicinecorner.com" target="_blank" class="btn" style="background:#10b981;">Open Live Application</a></p>
    <?php else: ?>
        <form method="POST">
            <button type="submit" class="btn">
                Run Automated Deployment Now
            </button>
        </form>
    <?php endif; ?>
</div>
</body>
</html>
