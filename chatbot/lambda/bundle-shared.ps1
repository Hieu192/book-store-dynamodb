# Bundle shared code - FIXED VERSION
Write-Host "Bundling shared code into Lambda functions..." -ForegroundColor Cyan

$functions = @("connect", "disconnect", "send-message", "upload-document")

foreach ($func in $functions) {
    Write-Host "  Processing $func..." -ForegroundColor Yellow
    
    # Create package.json if not exists
    if (!(Test-Path "$func/package.json")) {
        Set-Content -Path "$func/package.json" -Value '{
  "dependencies": {
    "jsonwebtoken": "^9.0.2"
  }
}'
    }
    
    # Install npm dependencies FIRST
    Push-Location $func
    npm install --production --no-package-lock 2>&1 | Out-Null
    Pop-Location
    
    # THEN copy shared code (so npm doesn't overwrite)
    $nodeModules = "$func/node_modules"
    @("auth", "bedrock", "dynamodb", "utils") | ForEach-Object {
        $modulePath = "$nodeModules/$_"
        New-Item -ItemType Directory -Force -Path $modulePath | Out-Null
        Copy-Item "shared/$_.js" -Destination "$modulePath/index.js" -Force
    }
}

Write-Host "Done! Shared code bundled into all functions" -ForegroundColor Green
Write-Host "Verify: " -NoNewline -ForegroundColor Yellow
Get-ChildItem "connect/node_modules" -Directory | Where-Object { $_.Name -in @("auth","bedrock","dynamodb","utils") } | ForEach-Object { Write-Host $_.Name -NoNewline -ForegroundColor Green; Write-Host ", " -NoNewline }
Write-Host ""
