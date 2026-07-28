param(
  [string]$Output = "backups\everyvan-$(Get-Date -Format yyyyMMdd-HHmmss).dump",
  [string]$DatabaseUrl = $env:DATABASE_URL
)
if (-not $DatabaseUrl) { throw "Set DATABASE_URL before creating a backup" }
$folder = Split-Path -Parent $Output
if ($folder -and -not (Test-Path $folder)) { New-Item -ItemType Directory -Path $folder | Out-Null }
pg_dump --dbname=$DatabaseUrl -Fc -f $Output
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed" }
Write-Host "Backup written to $Output"
