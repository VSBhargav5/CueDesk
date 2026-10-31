@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\electron\dist\electron.exe" (
  echo CueDesk dependencies are missing. Follow the setup instructions in README.md.
  pause
  exit /b 1
)
"%~dp0node_modules\electron\dist\electron.exe" .
if errorlevel 1 pause
