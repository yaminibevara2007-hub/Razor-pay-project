# scripts/start-dev.ps1
# AI Revenue Recovery Engine — Local Development Startup Script

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting AI Revenue Recovery Engine (Local Dev)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check Docker status
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "[1/4] Docker found. Attempting to start PostgreSQL container..." -ForegroundColor Green
    docker compose up -d
} else {
    Write-Host "[1/4] Docker not detected. Continuing with resilient in-memory / local fallback." -ForegroundColor Yellow
}

# 2. Start ML Service (Port 8000)
Write-Host "[2/4] Starting FastAPI ML Service on port 8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..\ml-service'; if (Test-Path .\venv\Scripts\Activate.ps1) { .\venv\Scripts\Activate.ps1 }; uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

# 3. Start Backend (Port 5000)
Write-Host "[3/4] Starting Node.js / Express Backend on port 5000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..\backend'; npm run dev"

# 4. Start Frontend (Port 5173)
Write-Host "[4/4] Starting React / Vite Frontend on port 5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..\frontend'; npm run dev"

Write-Host "`nAll services launched in separate windows!" -ForegroundColor Cyan
Write-Host "  Frontend:   http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:    http://localhost:5000/api/health" -ForegroundColor White
Write-Host "  ML Service: http://localhost:8000/health" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
