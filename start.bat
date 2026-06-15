@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [Error] Node.js is not installed or not available in PATH.
  echo Download Node.js from https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules\vite\bin\vite.js" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [Error] Failed to install dependencies.
    pause
    exit /b 1
  )
)

echo Starting todo list...
echo Open http://localhost:5173
start "" "http://localhost:5173"
call npm run dev

if errorlevel 1 (
  echo.
  echo [Error] Failed to start the application.
  pause
)
