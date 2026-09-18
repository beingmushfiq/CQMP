<?php
/**
 * CQMP Emergency Disk Cleanup & Diagnostic Web Script
 * 
 * Access via: https://api.ferozamedicinecorner.com/clean_disk.php?key=cqmp_clean_2026
 * (Delete or password-protect this file after use!)
 */

// Simple security check: pass ?key=cqmp_clean_2026 or set your custom key
$validKey = 'cqmp_clean_2026';
$providedKey = $_GET['key'] ?? '';

if ($providedKey !== $validKey) {
    http_response_code(403);
    echo '<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;text-align:center;">';
    echo '<h2>Access Denied</h2><p>Please provide the valid security key in the URL: <code>?key=' . htmlspecialchars($validKey) . '</code></p>';
    echo '</body></html>';
    exit;
}

$action = $_GET['action'] ?? 'report'; // 'report' or 'clean'

$baseDir = realpath(__DIR__ . '/..');
$logDir = $baseDir . '/storage/logs';
$publicHtmlDir = realpath($baseDir . '/..'); // typically /home/username/public_html

function formatBytes($bytes) {
    if ($bytes >= 1073741824) return number_format($bytes / 1073741824, 2) . ' GB';
    if ($bytes >= 1048576) return number_format($bytes / 1048576, 2) . ' MB';
    if ($bytes >= 1024) return number_format($bytes / 1024, 2) . ' KB';
    return $bytes . ' B';
}

$report = [];
$totalFreed = 0;

// 1. Scan storage/logs
if (is_dir($logDir)) {
    $files = scandir($logDir);
    foreach ($files as $f) {
        if ($f === '.' || $f === '..') continue;
        $path = $logDir . '/' . $f;
        if (is_file($path)) {
            $size = filesize($path);
            $report['logs'][] = ['name' => $f, 'path' => $path, 'size' => $size, 'formatted' => formatBytes($size)];
            if ($action === 'clean' && $size > 0) {
                file_put_contents($path, '');
                $totalFreed += $size;
            }
        }
    }
}

// 2. Scan for error_log in public_html and baseDir
$searchDirs = array_unique([$baseDir, __DIR__, $publicHtmlDir]);
$report['error_logs'] = [];
foreach ($searchDirs as $sd) {
    if (!$sd || !is_dir($sd)) continue;
    $errPath = $sd . '/error_log';
    if (is_file($errPath)) {
        $size = filesize($errPath);
        $report['error_logs'][] = ['path' => $errPath, 'size' => $size, 'formatted' => formatBytes($size)];
        if ($action === 'clean' && $size > 0) {
            file_put_contents($errPath, '');
            $totalFreed += $size;
        }
    }
}

// 3. Scan for archives in searchDirs
$report['archives'] = [];
foreach ($searchDirs as $sd) {
    if (!$sd || !is_dir($sd)) continue;
    $entries = @scandir($sd) ?: [];
    foreach ($entries as $e) {
        $ext = strtolower(pathinfo($e, PATHINFO_EXTENSION));
        if (in_array($ext, ['zip', 'gz', 'tar', 'tgz', 'rar', 'bak'])) {
            $archPath = $sd . '/' . $e;
            if (is_file($archPath)) {
                $size = filesize($archPath);
                $report['archives'][] = ['name' => $e, 'path' => $archPath, 'size' => $size, 'formatted' => formatBytes($size)];
                if ($action === 'clean') {
                    @unlink($archPath);
                    $totalFreed += $size;
                }
            }
        }
    }
}

// 4. Scan for node_modules in searchDirs
$report['node_modules'] = [];
foreach ($searchDirs as $sd) {
    if (!$sd || !is_dir($sd)) continue;
    $nmPath = $sd . '/node_modules';
    if (is_dir($nmPath)) {
        $report['node_modules'][] = ['path' => $nmPath];
        if ($action === 'clean') {
            // Note: rmdir on large node_modules can take seconds
            exec("rm -rf " . escapeshellarg($nmPath));
        }
    }
}

// Clean framework cache if action=clean
if ($action === 'clean') {
    $views = glob($baseDir . '/storage/framework/views/*.php');
    if ($views) foreach ($views as $v) { $totalFreed += filesize($v); @unlink($v); }
}

?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>CQMP Disk Diagnostic & Cleanup</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 30px; line-height: 1.5; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; max-width: 800px; margin: 0 auto 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
        h1, h2, h3 { color: #38bdf8; margin-top: 0; }
        .btn { display: inline-block; padding: 12px 24px; border-radius: 8px; font-weight: 600; text-decoration: none; cursor: pointer; border: none; font-size: 14px; }
        .btn-danger { background: #ef4444; color: white; }
        .btn-danger:hover { background: #dc2626; }
        .btn-secondary { background: #334155; color: #f8fafc; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
        th, td { text-align: left; padding: 10px; border-bottom: 1px solid #334155; font-size: 13px; }
        th { color: #94a3b8; font-weight: 600; }
        .badge { background: #3b82f6; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
        .badge-warn { background: #f59e0b; color: black; }
        .alert { padding: 16px; border-radius: 8px; margin-bottom: 20px; font-weight: 500; }
        .alert-success { background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #34d399; }
    </style>
</head>
<body>
<div class="card">
    <h1>CQMP Disk Diagnostic & Cleanup</h1>
    <p>Target Root: <code><?= htmlspecialchars($publicHtmlDir) ?></code></p>

    <?php if ($action === 'clean'): ?>
        <div class="alert alert-success">
            ✓ Cleanup executed successfully! Recovered <strong><?= formatBytes($totalFreed) ?></strong> of disk space.
        </div>
    <?php endif; ?>

    <h3>1. Log Files (<code>storage/logs/</code>)</h3>
    <table>
        <tr><th>Filename</th><th>Size</th></tr>
        <?php if (empty($report['logs'])): ?>
            <tr><td colspan="2" style="color: #64748b;">No log files found.</td></tr>
        <?php else: foreach ($report['logs'] as $log): ?>
            <tr><td><?= htmlspecialchars($log['name']) ?></td><td><span class="badge"><?= $log['formatted'] ?></span></td></tr>
        <?php endforeach; endif; ?>
    </table>

    <h3>2. Apache / PHP Error Logs (<code>error_log</code>)</h3>
    <table>
        <tr><th>Path</th><th>Size</th></tr>
        <?php if (empty($report['error_logs'])): ?>
            <tr><td colspan="2" style="color: #64748b;">No error_log files found.</td></tr>
        <?php else: foreach ($report['error_logs'] as $err): ?>
            <tr><td><?= htmlspecialchars($err['path']) ?></td><td><span class="badge badge-warn"><?= $err['formatted'] ?></span></td></tr>
        <?php endforeach; endif; ?>
    </table>

    <h3>3. Leftover Deployment Archives (.zip, .tar.gz)</h3>
    <table>
        <tr><th>Filename</th><th>Size</th></tr>
        <?php if (empty($report['archives'])): ?>
            <tr><td colspan="2" style="color: #64748b;">No leftover archives detected.</td></tr>
        <?php else: foreach ($report['archives'] as $arch): ?>
            <tr><td><?= htmlspecialchars($arch['name']) ?></td><td><span class="badge badge-warn"><?= $arch['formatted'] ?></span></td></tr>
        <?php endforeach; endif; ?>
    </table>

    <?php if (!empty($report['node_modules'])): ?>
        <h3>4. Production <code>node_modules</code> Detected!</h3>
        <p style="color: #f87171;">Warning: node_modules found in production. This should be deleted.</p>
        <?php foreach ($report['node_modules'] as $nm): ?>
            <p><code><?= htmlspecialchars($nm['path']) ?></code></p>
        <?php endforeach; ?>
    <?php endif; ?>

    <div style="margin-top: 30px; display: flex; gap: 15px;">
        <a href="?key=<?= urlencode($validKey) ?>&action=clean" class="btn btn-danger" onclick="return confirm('Are you sure you want to clean runaway logs, archives, and caches?')">
            Purge & Clean Runaway Files Now
        </a>
        <a href="?key=<?= urlencode($validKey) ?>&action=report" class="btn btn-secondary">
            Refresh Report
        </a>
    </div>
</div>
</body>
</html>
