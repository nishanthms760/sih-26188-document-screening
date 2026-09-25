@echo off
echo ====================================================================
echo Starting MHA Border Intelligence - Checkpoint Document Screening
echo ====================================================================

echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "SSB Screening Backend" cmd /k "cd backend && .venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Starting Vite React Frontend ...
start "SSB Screening Frontend" cmd /k "cd frontend && npm run dev"

echo ====================================================================
echo Both servers are starting up! 
echo - Backend API:   http://127.0.0.1:8000
echo - Swagger Docs:  http://127.0.0.1:8000/docs
echo - Health Check:  http://127.0.0.1:8000/health
echo - Frontend App:  http://localhost:5173 (or 5174 / 5175 if 5173 is in use)
echo ====================================================================
