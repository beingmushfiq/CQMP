<?php
/**
 * CQMP - Production API In-Process Router & Gateway
 * 
 * Routes /api/* directly to the backend Laravel installation on the same server.
 * This completely avoids:
 *  - Imunify360 Bot-Protection / WebShield blocks on server-side cURL loopback
 *  - Cross-origin CORS preflight overhead
 *  - Network latency between subdomains on the same host
 */

// Allow long-running operations if needed
set_time_limit(60);

// Candidate backend directories on cPanel / production
$possibleBackendPaths = [
    '/home/httpferozamedici/api.ferozamedicinecorner.com',
    '/home/httpferozamedici/public_html/api.ferozamedicinecorner.com',
    dirname(__DIR__) . '/api.ferozamedicinecorner.com',
    dirname(dirname(__DIR__)) . '/api.ferozamedicinecorner.com',
    dirname(__DIR__) . '/backend',
    realpath(__DIR__ . '/../../backend'),
    'C:/CQMP/backend',
    'D:/CQMP/backend',
];

$backendPath = null;
foreach ($possibleBackendPaths as $path) {
    if (!empty($path) && file_exists($path . '/bootstrap/app.php') && file_exists($path . '/vendor/autoload.php')) {
        $backendPath = realpath($path);
        break;
    }
}

if ($backendPath) {
    $publicDir = is_dir($backendPath . '/public') ? $backendPath . '/public' : $backendPath;
    chdir($publicDir);

    if (!defined('LARAVEL_START')) {
        define('LARAVEL_START', microtime(true));
    }

    if (file_exists($backendPath . '/storage/framework/maintenance.php')) {
        require $backendPath . '/storage/framework/maintenance.php';
    }

    require_once $backendPath . '/vendor/autoload.php';

    /** @var \Illuminate\Foundation\Application $app */
    $app = require_once $backendPath . '/bootstrap/app.php';

    $app->handleRequest(\Illuminate\Http\Request::capture());
    exit;
}

// ── Fallback: If backend folder is not found on disk, attempt cURL proxy ──
$targetHost = 'https://api.ferozamedicinecorner.com';
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$targetUrl = $targetHost . $requestUri;

$ch = curl_init($targetUrl);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

$forwardHeaders = [];
if (function_exists('getallheaders')) {
    $incomingHeaders = getallheaders();
} else {
    $incomingHeaders = [];
    foreach ($_SERVER as $key => $val) {
        if (str_starts_with($key, 'HTTP_')) {
            $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5)))));
            $incomingHeaders[$name] = $val;
        }
    }
}

foreach ($incomingHeaders as $name => $value) {
    $lower = strtolower($name);
    if (in_array($lower, ['host', 'content-length', 'expect'])) {
        continue;
    }
    $forwardHeaders[] = "{$name}: {$value}";
}

$clientIp = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
$forwardHeaders[] = "X-Forwarded-For: {$clientIp}";
$forwardHeaders[] = "X-Forwarded-Host: " . ($_SERVER['HTTP_HOST'] ?? 'serial.ferozamedicinecorner.com');
$forwardHeaders[] = "X-Forwarded-Proto: " . ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http');

if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
    $body = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

curl_setopt($ch, CURLOPT_HTTPHEADER, $forwardHeaders);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 45);

$response = curl_exec($ch);

if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode([
        'message' => 'Backend Gateway Error',
        'error' => curl_error($ch),
        'searched_paths' => $possibleBackendPaths
    ]);
    curl_close($ch);
    exit;
}

$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$rawHeaders = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);

http_response_code($httpCode);

$headerLines = explode("\r\n", $rawHeaders);
foreach ($headerLines as $line) {
    $line = trim($line);
    if (empty($line) || stripos($line, 'HTTP/') === 0) {
        continue;
    }
    if (preg_match('/^(Transfer-Encoding|Content-Encoding):/i', $line)) {
        continue;
    }
    header($line, false);
}

echo $body;
