# Skrypt PowerShell uruchamiający migrację dodającą pole rowBackgroundColor
# Użycie: .\run_migration_row_background_color.ps1

Write-Host "🚀 Uruchamianie migracji: Dodawanie pola rowBackgroundColor" -ForegroundColor Green
Write-Host "📅 Data: $(Get-Date)" -ForegroundColor Cyan
Write-Host ""

# Sprawdź czy plik .env istnieje
if (Test-Path "server-env-correct.env") {
    Write-Host "📁 Ładowanie zmiennych środowiskowych z server-env-correct.env" -ForegroundColor Yellow
    Get-Content "server-env-correct.env" | ForEach-Object {
        if ($_ -match "^([^#].*)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
} elseif (Test-Path ".env") {
    Write-Host "📁 Ładowanie zmiennych środowiskowych z .env" -ForegroundColor Yellow
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([^#].*)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
} else {
    Write-Host "⚠️  Plik .env nie znaleziony. Używanie domyślnych ustawień." -ForegroundColor Yellow
    $env:MONGODB_URI = "mongodb://localhost:27017"
    $env:DB_NAME = "bukowski_inventory"
}

$dbName = $env:DB_NAME
$mongoUri = $env:MONGODB_URI -replace "://[^:]*:[^@]*@", "://***:***@"

Write-Host "🗃️  Baza danych: $dbName" -ForegroundColor Cyan
Write-Host "🔗 MongoDB URI: $mongoUri" -ForegroundColor Cyan
Write-Host ""

# Uruchom migrację
Write-Host "🔄 Uruchamianie migracji..." -ForegroundColor Yellow
try {
    node migrate_add_row_background_color.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Migracja zakończona pomyślnie!" -ForegroundColor Green
        Write-Host "📝 Wszystkie produkty mają teraz pole rowBackgroundColor" -ForegroundColor Green
    } else {
        throw "Migracja zakończona błędem (kod: $LASTEXITCODE)"
    }
} catch {
    Write-Host ""
    Write-Host "❌ Migracja zakończona błędem!" -ForegroundColor Red
    Write-Host "📝 Sprawdź logi powyżej dla szczegółów" -ForegroundColor Red
    exit 1
}