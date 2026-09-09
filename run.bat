@echo off
echo ===================================================
echo   Starting Leher (Fast Local Development)
echo ===================================================

echo [1/2] Launching FastAPI Backend on http://127.0.0.1:8000...
start "Leher Backend API" powershell -NoExit -Command "cd backend; & .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Launching Vite Frontend on http://localhost:5173...
start "Leher Frontend" npm run dev

echo.
echo Both servers are launching in parallel windows!
echo - Frontend: http://localhost:5173
echo - Backend:  http://127.0.0.1:8000
echo - API Docs: http://127.0.0.1:8000/docs
echo ===================================================
