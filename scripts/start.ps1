# Start AccessPilot (API + built UI + demo site) on http://127.0.0.1:8000/
# --reload is intentionally not used: on Windows it switches the event loop and is slower to restart.
$root = Split-Path -Parent $PSScriptRoot
Set-Location "$root\backend"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
