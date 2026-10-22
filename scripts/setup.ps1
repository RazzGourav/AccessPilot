# One-time setup on Windows (PowerShell). Run from the repository root:  .\scripts\setup.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "== Backend: virtualenv, packages, Chromium"
Set-Location "$root\backend"
if (-not (Test-Path ".venv")) { python -m venv .venv }
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m playwright install chromium
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env"; Write-Host "Created backend\.env (add GITHUB_TOKEN to enable the AI agent)" }

Write-Host "== Frontend: packages and production build"
Set-Location "$root\frontend"
npm install --no-audit --no-fund
npm run build

Set-Location $root
Write-Host ""
Write-Host "Done. Start with:  .\scripts\start.ps1   then open http://127.0.0.1:8000/"
