# ──────────────────────────────────────────────────────────────
# CQMP — Automated Packager for cPanel Deployment
# ──────────────────────────────────────────────────────────────
# Builds the frontend in production mode and generates a single,
# lightweight update archive (cqmp_update.zip) containing only
# the required frontend & backend updates.
# ──────────────────────────────────────────────────────────────

$ErrorActionPreference = 'Stop'
$rootDir = (Get-Item -Path '.').FullName

Write-Host '==========================================================' -ForegroundColor Cyan
Write-Host ' CQMP Automated cPanel Update Packager' -ForegroundColor Cyan
Write-Host (' Root: ' + $rootDir) -ForegroundColor Cyan
Write-Host '==========================================================' -ForegroundColor Cyan

# 1. Build frontend in production mode
Write-Host ''
Write-Host '>>> [1/4] Building Frontend for Production...' -ForegroundColor Yellow
$frontendDir = Join-Path $rootDir 'frontend'
Set-Location -Path $frontendDir
npm run build -- --mode production
if ($LASTEXITCODE -ne 0) {
    Write-Error 'Frontend build failed!'
    exit 1
}
Set-Location -Path $rootDir
Write-Host '✓ Frontend built successfully into frontend/dist/' -ForegroundColor Green

# 2. Prepare packaging staging folder
Write-Host ''
Write-Host '>>> [2/4] Assembling Updated Files...' -ForegroundColor Yellow
$tempDir = Join-Path $rootDir '_package_staging'
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }

$stagingFrontend = Join-Path $tempDir 'frontend_dist'
$stagingBackend = Join-Path $tempDir 'backend_update'
New-Item -ItemType Directory -Path $stagingFrontend -Force | Out-Null
New-Item -ItemType Directory -Path $stagingBackend -Force | Out-Null

# Copy Frontend dist
$distPath = Join-Path $frontendDir 'dist\*'
Copy-Item -Recurse -Force $distPath $stagingFrontend

# Copy Backend updated components
$backendItems = @(
    'app',
    'database/migrations',
    'routes',
    'scripts',
    'config',
    'public/clean_disk.php',
    'public/deploy_web.php',
    '.env.production.backup'
)

$backendDir = Join-Path $rootDir 'backend'
foreach ($item in $backendItems) {
    $src = Join-Path $backendDir $item
    $dest = Join-Path $stagingBackend $item
    if (Test-Path $src) {
        $parent = Split-Path -Parent $dest
        if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        Copy-Item -Recurse -Force $src $dest
        Write-Host ('  + Added ' + $item) -ForegroundColor DarkGray
    }
}

# Copy installer script to root of zip
$deployScriptSrc = Join-Path $backendDir 'scripts/deploy_server.sh'
$deployScriptDest = Join-Path $tempDir 'deploy.sh'
Copy-Item -Force $deployScriptSrc $deployScriptDest

# 3. Create zip archive
Write-Host ''
Write-Host '>>> [3/4] Creating cqmp_update.zip...' -ForegroundColor Yellow
$zipOutput = Join-Path $rootDir 'cqmp_update.zip'
if (Test-Path $zipOutput) { Remove-Item -Force $zipOutput }

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $zipOutput)

# 4. Clean up staging
Remove-Item -Recurse -Force $tempDir

$zipSize = (Get-Item $zipOutput).Length / 1MB
$roundedSize = [math]::Round($zipSize, 2)

Write-Host ''
Write-Host '==========================================================' -ForegroundColor Green
Write-Host ' SUCCESS! Created update archive:' -ForegroundColor Green
Write-Host (' File: ' + $zipOutput + ' - Size: ' + $roundedSize + ' MB') -ForegroundColor White
Write-Host '==========================================================' -ForegroundColor Green

Write-Host ''
Write-Host 'HOW TO DEPLOY ON CPANEL:' -ForegroundColor Yellow
Write-Host 'Option A (Web - No SSH):' -ForegroundColor Cyan
Write-Host '  1. Upload cqmp_update.zip and backend/public/deploy_web.php to your backend public folder.'
Write-Host '  2. Open https://api.ferozamedicinecorner.com/deploy_web.php?key=cqmp_deploy_2026 in browser and click Deploy.'
Write-Host ''
Write-Host 'Option B (cPanel Terminal / SSH):' -ForegroundColor Cyan
Write-Host '  1. Upload cqmp_update.zip to /home/httpferozamedici/'
Write-Host '  2. In Terminal run: unzip -o cqmp_update.zip; bash deploy.sh'
