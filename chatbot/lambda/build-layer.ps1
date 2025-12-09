# Build Lambda Layer - CORRECT Structure
Write-Host "Building Lambda Layer..." -ForegroundColor Cyan

# Clean
if (Test-Path "layer-build") { Remove-Item "layer-build" -Recurse -Force }
if (Test-Path "shared-layer.zip") { Remove-Item "shared-layer.zip" -Force }

# Create correct structure: nodejs/node_modules/
$nodeModules = "layer-build/nodejs/node_modules"
New-Item -ItemType Directory -Force -Path $nodeModules | Out-Null

# Copy each shared file as a module
@("auth", "bedrock", "dynamodb", "utils") | ForEach-Object {
    $modulePath = "$nodeModules/$_"
    New-Item -ItemType Directory -Force -Path $modulePath | Out-Null
    Copy-Item "shared/$_.js" -Destination "$modulePath/index.js"
}

# Create package.json in nodejs/ for jsonwebtoken
Set-Content -Path "layer-build/nodejs/package.json" -Value '{
  "dependencies": {
    "jsonwebtoken": "^9.0.2"
  }
}'

# Install jsonwebtoken
Push-Location "layer-build/nodejs"
npm install --production --no-package-lock
Pop-Location

# Zip
Push-Location "layer-build"
Compress-Archive -Path "nodejs" -DestinationPath "../shared-layer.zip" -Force
Pop-Location

# Cleanup
Remove-Item "layer-build" -Recurse -Force

Write-Host "Done! Layer structure:" -ForegroundColor Green
Write-Host "  nodejs/node_modules/dynamodb/index.js" -ForegroundColor Gray
Write-Host "  nodejs/node_modules/utils/index.js" -ForegroundColor Gray
Write-Host "  nodejs/node_modules/auth/index.js" -ForegroundColor Gray
Write-Host "  nodejs/node_modules/bedrock/index.js" -ForegroundColor Gray
Write-Host "  nodejs/node_modules/jsonwebtoken/" -ForegroundColor Gray
