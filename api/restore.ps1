param(
  [Parameter(Mandatory=$true)][string]$InputFile,
  [string]$DatabaseUrl = $env:DATABASE_URL
)
if (-not (Test-Path -LiteralPath $InputFile)) { throw "Backup file not found: $InputFile" }
if (-not $DatabaseUrl) { throw "Set DATABASE_URL before restoring a backup" }
pg_restore --dbname=$DatabaseUrl --clean --if-exists $InputFile
if ($LASTEXITCODE -ne 0) { throw "pg_restore failed" }
Write-Host "Database restored from $InputFile"
