@echo off
setlocal
cd /d "%~dp0"
set PORT=%~1
if "%PORT%"=="" set PORT=8000
set URL=http://localhost:%PORT%/

where py >nul 2>nul
if not errorlevel 1 (
  echo 4K Mug has started: %URL%
  echo Press Ctrl+C to stop the server.
  start "" "%URL%"
  py -m http.server %PORT%
) else (
  where python >nul 2>nul
  if not errorlevel 1 (
    echo 4K Mug has started: %URL%
    echo Press Ctrl+C to stop the server.
    start "" "%URL%"
    python -m http.server %PORT%
  ) else (
    echo Python was not found. Install Python 3, then run this file again.
    pause
  )
)
