@echo off
title Kheyal Workspace Launcher
echo ========================================================
echo Starting Kheyal (Plan Smart. Move Forward.)
echo ========================================================
echo.

echo [1/2] Starting Backend API on port 5000...
start "Kheyal Backend (Port 5000)" cmd /k "cd server && npm start"

echo [2/2] Starting Next.js Frontend on port 3000...
start "Kheyal Frontend (Port 3000)" cmd /k "cd client && npm start"

echo.
echo Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

echo Opening browser at http://localhost:3000...
start http://localhost:3000

echo.
echo Both servers are running! Keep the two terminal windows open.
echo Close those windows when you want to stop the application.
