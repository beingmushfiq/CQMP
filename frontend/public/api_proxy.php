<?php
/**
 * CQMP - Production API Reverse Proxy
 * Eliminates cross-origin CORS preflight and firewall blocks by routing
 * API calls locally from serial.ferozamedicinecorner.com to backend.
 */

// Disable execution time limit for long-polling / slow queries
set_time_limit(60);

$targetHost = 'https://api.ferozamedicinecorner.com';
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';

// Target URL
$targetUrl = $targetHost . $requestUri;

// Initialize cURL
$ch = curl_init($targetUrl);

// Match the incoming HTTP Method
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

// Forward request headers
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
    // Skip headers that cURL or the destination webserver manages
    if (in_array($lower, ['host', 'content-length', 'expect'])) {
        continue;
    }
    $forwardHeaders[] = "{$name}: {$value}";
}

// Attach Client Information headers
$clientIp = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
$forwardHeaders[] = "X-Forwarded-For: {$clientIp}";
$forwardHeaders[] = "X-Forwarded-Host: " . ($_SERVER['HTTP_HOST'] ?? 'serial.ferozamedicinecorner.com');
$forwardHeaders[] = "X-Forwarded-Proto: " . ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http');

// Forward payload for POST, PUT, PATCH, DELETE
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
        'error' => curl_error($ch)
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

// Forward response headers
$headerLines = explode("\r\n", $rawHeaders);
foreach ($headerLines as $line) {
    $line = trim($line);
    if (empty($line) || stripos($line, 'HTTP/') === 0) {
        continue;
    }
    // Filter out transfer-encoding or content-encoding chunked to prevent gzip mismatches
    if (preg_match('/^(Transfer-Encoding|Content-Encoding):/i', $line)) {
        continue;
    }
    header($line, false);
}

echo $body;
