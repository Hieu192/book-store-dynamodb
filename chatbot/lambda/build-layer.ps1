# Build Lambda Layer - CORRECT ORDER: NPM FIRST, THEN COPY CUSTOM MODULES
Write-Host "Building Lambda Layer..." -ForegroundColor Cyan

# Clean
if (Test-Path "layer-build") { Remove-Item "layer-build" -Recurse -Force }
if (Test-Path "shared-layer.zip") { Remove-Item "shared-layer.zip" -Force }

# 1. Create structure
$nodeModules = "layer-build/nodejs/node_modules"
New-Item -ItemType Directory -Force -Path $nodeModules | Out-Null

# 2. Create package.json and install npm dependencies FIRST
Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
Set-Content -Path "layer-build/nodejs/package.json" -Value '{
  "dependencies": {
    "jsonwebtoken": "^9.0.2",
    "axios": "^1.6.2",
    "aws-sdk": "^2.1498.0"
  }
}'

Push-Location "layer-build/nodejs"
npm install --production --no-package-lock 2>&1 | Out-Null
Pop-Location
Write-Host "  Installed axios + jsonwebtoken" -ForegroundColor Gray

# 3. NOW copy custom modules (AFTER npm install)
Write-Host "Copying custom modules..." -ForegroundColor Yellow
@("auth", "bedrock", "dynamodb", "utils") | ForEach-Object {
    $modulePath = "$nodeModules/$_"
    New-Item -ItemType Directory -Force -Path $modulePath | Out-Null
    Copy-Item "shared/$_.js" -Destination "$modulePath/index.js"
}
Write-Host "  Copied auth, bedrock, dynamodb, utils" -ForegroundColor Gray

# 4. Copy prompts
Write-Host "Copying prompts..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "$nodeModules/bedrock/prompts" | Out-Null
Get-ChildItem "shared/prompts/*.js" | Copy-Item -Destination "$nodeModules/bedrock/prompts/"
Write-Host "  Copied 4 prompt files" -ForegroundColor Gray

# 5. Copy tools
Write-Host "Copying tools..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "$nodeModules/bedrock/tools" | Out-Null
Get-ChildItem "shared/tools/*.js" | Copy-Item -Destination "$nodeModules/bedrock/tools/"
Write-Host "  Copied 1 tool file" -ForegroundColor Gray

# 6. Verify
Write-Host "Verifying..." -ForegroundColor Yellow
$check1 = Test-Path "layer-build/nodejs/node_modules/bedrock/index.js"
$check2 = Test-Path "layer-build/nodejs/node_modules/bedrock/prompts/persona.js"
$check3 = Test-Path "layer-build/nodejs/node_modules/bedrock/tools/orderTools.js"
$check4 = Test-Path "layer-build/nodejs/node_modules/axios"

if ($check1 -and $check2 -and $check3 -and $check4) {
    Write-Host "  All files present!" -ForegroundColor Green
} else {
    Write-Host "ERROR - Missing:" -ForegroundColor Red
    if (!$check1) { Write-Host "  bedrock/index.js" -ForegroundColor Red }
    if (!$check2) { Write-Host "  prompts/persona.js" -ForegroundColor Red }
    if (!$check3) { Write-Host "  tools/orderTools.js" -ForegroundColor Red }
    if (!$check4) { Write-Host "  axios" -ForegroundColor Red }
    exit 1
}

# 7. Create zip
Write-Host "Creating zip..." -ForegroundColor Yellow
Push-Location "layer-build"
Compress-Archive -Path "nodejs" -DestinationPath "../shared-layer.zip" -Force
Pop-Location

# 8. Cleanup
Remove-Item "layer-build" -Recurse -Force

Write-Host ""
Write-Host "SUCCESS! Layer ready for deployment" -ForegroundColor Green
