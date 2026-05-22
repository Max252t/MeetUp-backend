# Runs Prisma migrations for all services that have a prisma schema.
# Usage: .\scripts\migrate-all.ps1
# Requires Docker infra to be running first: cd infra && docker-compose up -d

$root = Split-Path $PSScriptRoot -Parent

$services = @(
  "auth-service",
  "profile-service",
  "chat-service",
  "media-service",
  "notifications-service"
)

foreach ($svc in $services) {
  $envFile = "$root\apps\$svc\.env"
  $svcDir  = "$root\apps\$svc"

  if (-not (Test-Path $envFile)) {
    Write-Host "[$svc] SKIP — .env not found" -ForegroundColor Yellow
    continue
  }

  # Load .env into current process environment
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
      $key   = $matches[1].Trim()
      $value = $matches[2].Trim().Trim('"')
      [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }

  Push-Location $svcDir
  try {
    Write-Host "[$svc] Running prisma generate..." -ForegroundColor Cyan
    & npx prisma generate 2>&1
    if ($LASTEXITCODE -ne 0) {
      Write-Host "[$svc] prisma generate FAILED (exit $LASTEXITCODE)" -ForegroundColor Red
    }

    Write-Host "[$svc] Running prisma migrate dev..." -ForegroundColor Cyan
    & npx prisma migrate dev --name init 2>&1
    if ($LASTEXITCODE -eq 0) {
      Write-Host "[$svc] OK" -ForegroundColor Green
    } else {
      Write-Host "[$svc] FAILED (exit $LASTEXITCODE)" -ForegroundColor Red
    }
  } finally {
    Pop-Location
  }
}
