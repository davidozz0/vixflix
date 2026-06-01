@echo off
setlocal enabledelayedexpansion

echo ========================================
echo     VixFlix - Installation Wizard
echo ========================================
echo.

:: --- Step 1: Check Node.js ---
echo [1/5] Checking Node.js...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   Node.js not found.
    choice /c YN /m "  Install Node.js 22? (Y=yes, N=no)"
    if errorlevel 2 goto :abort
    echo   Please install Node.js 22+ from https://nodejs.org
    echo   Then re-run this script.
    pause
    exit /b 1
)
for /f "tokens=2 delims=v." %%a in ('node -v 2^>nul') do set NODE_MAJOR=%%a
echo   Node.js found.

:: --- Step 2: Check npm ---
echo [2/5] Checking npm...
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   npm not found. Please install Node.js first.
    pause
    exit /b 1
)
echo   npm found.

:: --- Step 3: TMDB API Key ---
echo.
echo [3/5] TMDB API Key
echo   Get your free key at: https://www.themoviedb.org/settings/api
echo   Use an Access Token (v4^), not an API key (v3^).
echo.
set /p TMDB_KEY="  Paste your TMDB Access Token: "
if "%TMDB_KEY%"=="" (
    echo   No key provided. You can add it later in backend\.env
)

:: --- Step 4: Install dependencies ---
echo.
echo [4/5] Installing dependencies...
cd /d "%~dp0"
call npm install
echo   Root dependencies installed

cd backend
call npm install
cd ..
echo   Backend dependencies installed

cd frontend
call npm install
cd ..
echo   Frontend dependencies installed

:: --- Step 4b: Write .env ---
set JWT_SECRET=%RANDOM%%RANDOM%%RANDOM%

if not "%TMDB_KEY%"=="" (
    (
        echo PORT=3000
        echo JWT_SECRET=!JWT_SECRET!
        echo DATABASE_URL=./sqlite.db
        echo TMDB_API_KEY=!TMDB_KEY!
    ) > backend\.env
    echo   backend\.env created
) else (
    (
        echo PORT=3000
        echo JWT_SECRET=!JWT_SECRET!
        echo DATABASE_URL=./sqlite.db
        echo TMDB_API_KEY=
    ) > backend\.env
    echo   backend\.env created ^(edit to add TMDB_API_KEY^)
)

:: --- Step 5: Start ---
echo.
echo [5/5] Ready!
choice /c YN /m "  Start VixFlix now? (Y=yes, N=no)"
if errorlevel 2 (
    echo   Run start.bat to start later.
    pause
    exit /b 0
)
echo Starting VixFlix...
call npm run dev
goto :eof

:abort
echo Aborted.
pause
exit /b 1
